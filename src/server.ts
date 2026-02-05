import * as http from 'http';
import * as url from 'url';
import * as crypto from 'crypto';

/**
 * 预览会话信息
 */
export interface PreviewSession {
    htmlContent: string;
    filePath: string;
    createdAt: number;
    lastAccessed: number;
}

/**
 * HTTP服务器单例
 * 负责提供markdown预览的HTML内容服务
 */
export class PreviewServer {
    private static instance: PreviewServer | null = null;
    private server: http.Server | null = null;
    private port: number = 3000;
    private previewSessions: Map<string, PreviewSession> = new Map();
    private cleanupInterval: NodeJS.Timeout | null = null;
    private maxSessions: number = 50;
    private sessionTimeout: number = 30 * 60 * 1000; // 30分钟

    private constructor() {
        // 私有构造函数，确保单例模式
    }

    /**
     * 获取服务器单例实例
     */
    public static getInstance(): PreviewServer {
        if (!PreviewServer.instance) {
            PreviewServer.instance = new PreviewServer();
        }
        return PreviewServer.instance;
    }

    /**
     * 更新配置
     */
    public updateConfig(config: { port?: number; maxSessions?: number; sessionTimeout?: number }): void {
        if (config.port !== undefined) {
            this.port = config.port;
        }
        if (config.maxSessions !== undefined) {
            this.maxSessions = config.maxSessions;
        }
        if (config.sessionTimeout !== undefined) {
            this.sessionTimeout = config.sessionTimeout * 60 * 1000; // 转换为毫秒
        }
    }

    /**
     * 启动HTTP服务器
     */
    public async start(): Promise<number> {
        if (this.server) {
            return this.port; // 服务器已启动，返回当前端口
        }

        return new Promise((resolve, reject) => {
            const tryStart = (port: number) => {
                this.server = http.createServer((req, res) => {
                    this.handleRequest(req, res);
                });

                this.server.listen(port, '127.0.0.1', () => {
                    this.port = port;
                    console.log(`Preview server started on port ${port}`);
                    this.startCleanupTimer();
                    resolve(port);
                });

                this.server.on('error', (err: NodeJS.ErrnoException) => {
                    if (err.code === 'EADDRINUSE') {
                        // 端口被占用，尝试下一个端口
                        this.server?.close();
                        tryStart(port + 1);
                    } else {
                        reject(err);
                    }
                });
            };

            tryStart(this.port);
        });
    }

    /**
     * 处理HTTP请求
     */
    private handleRequest(req: http.IncomingMessage, res: http.ServerResponse): void {
        const parsedUrl = url.parse(req.url || '', true);
        const pathname = parsedUrl.pathname || '';

        // 设置CORS头
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }

        // 处理预览请求：/preview/{previewId}
        const previewMatch = pathname.match(/^\/preview\/([a-f0-9]+)$/);
        if (previewMatch) {
            const previewId = previewMatch[1];
            const session = this.previewSessions.get(previewId);

            if (session) {
                // 更新最后访问时间
                session.lastAccessed = Date.now();

                // 返回HTML内容
                res.writeHead(200, {
                    'Content-Type': 'text/html; charset=utf-8',
                    'Cache-Control': 'no-cache'
                });
                res.end(session.htmlContent);
            } else {
                // 预览不存在
                res.writeHead(404, { 'Content-Type': 'text/plain' });
                res.end('Preview not found');
            }
            return;
        }

        // 根路径返回简单信息
        if (pathname === '/' || pathname === '') {
            res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            res.end(`
                <html>
                    <head><title>Markdown Preview Server</title></head>
                    <body>
                        <h1>Markdown Preview Server</h1>
                        <p>Server is running on port ${this.port}</p>
                        <p>Active previews: ${this.previewSessions.size}</p>
                    </body>
                </html>
            `);
            return;
        }

        // 404
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not found');
    }

    /**
     * 注册预览会话
     * @param htmlContent 渲染后的HTML内容
     * @param filePath 原始markdown文件路径
     * @returns 预览ID
     */
    public registerPreview(htmlContent: string, filePath: string): string {
        // 生成唯一预览ID（基于文件路径和时间戳的hash）
        const hash = crypto.createHash('sha256');
        hash.update(filePath + Date.now() + Math.random().toString());
        const previewId = hash.digest('hex').substring(0, 16);

        // 检查会话数量限制
        if (this.previewSessions.size >= this.maxSessions) {
            this.cleanupOldestSession();
        }

        // 注册新会话
        const session: PreviewSession = {
            htmlContent,
            filePath,
            createdAt: Date.now(),
            lastAccessed: Date.now()
        };

        this.previewSessions.set(previewId, session);

        return previewId;
    }

    /**
     * 获取预览URL
     */
    public getPreviewUrl(previewId: string): string {
        return `http://localhost:${this.port}/preview/${previewId}`;
    }

    /**
     * 启动清理定时器
     */
    private startCleanupTimer(): void {
        // 每5分钟清理一次过期会话
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredSessions();
        }, 5 * 60 * 1000);
    }

    /**
     * 清理过期会话
     */
    private cleanupExpiredSessions(): void {
        const now = Date.now();
        const expiredIds: string[] = [];

        this.previewSessions.forEach((session, id) => {
            if (now - session.lastAccessed > this.sessionTimeout) {
                expiredIds.push(id);
            }
        });

        expiredIds.forEach(id => {
            this.previewSessions.delete(id);
        });

        if (expiredIds.length > 0) {
            console.log(`Cleaned up ${expiredIds.length} expired preview sessions`);
        }
    }

    /**
     * 清理最旧的会话
     */
    private cleanupOldestSession(): void {
        let oldestId: string | null = null;
        let oldestTime = Date.now();

        this.previewSessions.forEach((session, id) => {
            if (session.createdAt < oldestTime) {
                oldestTime = session.createdAt;
                oldestId = id;
            }
        });

        if (oldestId) {
            this.previewSessions.delete(oldestId);
            console.log(`Cleaned up oldest preview session: ${oldestId}`);
        }
    }

    /**
     * 停止服务器
     */
    public stop(): void {
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }

        if (this.server) {
            this.server.close(() => {
                console.log('Preview server stopped');
            });
            this.server = null;
        }

        // 清理所有会话
        this.previewSessions.clear();
    }

    /**
     * 获取当前端口
     */
    public getPort(): number {
        return this.port;
    }

    /**
     * 获取服务器状态信息
     */
    public getStatus(): { isRunning: boolean; port: number; sessionCount: number; maxSessions: number } {
        return {
            isRunning: this.server !== null,
            port: this.port,
            sessionCount: this.previewSessions.size,
            maxSessions: this.maxSessions
        };
    }

    /**
     * 检查服务器是否运行
     */
    public isRunning(): boolean {
        return this.server !== null;
    }
}
