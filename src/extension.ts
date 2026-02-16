import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import * as child_process from 'child_process';
import { MarkdownRenderer } from './markdownRenderer';
import { PreviewServer } from './server';

let previewServer: PreviewServer | null = null;
let extensionContext: vscode.ExtensionContext | null = null;

/**
 * 扩展激活时调用
 */
export function activate(context: vscode.ExtensionContext) {
    console.log('Markdown Preview Extension is now active!');

    extensionContext = context;

    // 获取服务器单例
    previewServer = PreviewServer.getInstance();

    // 加载配置并更新服务器设置
    loadConfiguration();

    // 监听配置变化
    context.subscriptions.push(
        vscode.workspace.onDidChangeConfiguration(e => {
            if (e.affectsConfiguration('markdownPreview')) {
                loadConfiguration();
            }
        })
    );

    // 注册命令
    const commands = [
        vscode.commands.registerCommand('markdownPreview.previewInBrowser', previewMarkdownInBrowser),
        vscode.commands.registerCommand('markdownPreview.startServer', startServer),
        vscode.commands.registerCommand('markdownPreview.stopServer', stopServer),
        vscode.commands.registerCommand('markdownPreview.restartServer', restartServer),
        vscode.commands.registerCommand('markdownPreview.showServerStatus', showServerStatus)
    ];

    commands.forEach(cmd => context.subscriptions.push(cmd));

    // 扩展停用时清理资源
    context.subscriptions.push({
        dispose: () => {
            if (previewServer) {
                previewServer.stop();
                previewServer = null;
            }
        }
    });
}

/**
 * 在浏览器中预览markdown文件
 */
async function previewMarkdownInBrowser(): Promise<void> {
    try {
        // 获取当前活动的编辑器或选中的文件
        let filePath: string | undefined;

        // 尝试从活动编辑器获取文件路径
        const activeEditor = vscode.window.activeTextEditor;
        if (activeEditor && activeEditor.document.languageId === 'markdown') {
            filePath = activeEditor.document.uri.fsPath;
        } else {
            // 如果没有活动的markdown编辑器，尝试从资源管理器获取选中的文件
            // 注意：VSCode API不直接支持获取资源管理器中选中的文件
            // 所以主要依赖活动编辑器
            vscode.window.showWarningMessage('Please open a markdown file in the editor first.');
            return;
        }

        if (!filePath) {
            vscode.window.showErrorMessage('No markdown file found to preview.');
            return;
        }

        // 检查文件是否存在
        if (!fs.existsSync(filePath)) {
            vscode.window.showErrorMessage(`File not found: ${filePath}`);
            return;
        }

        // 读取markdown文件内容
        const markdownContent = fs.readFileSync(filePath, 'utf8');

        // 渲染markdown为HTML（使用内联模板，不依赖外部文件）
        const renderer = new MarkdownRenderer();
        const htmlContent = renderer.render(markdownContent);

        // 确保服务器已启动
        if (!previewServer) {
            previewServer = PreviewServer.getInstance();
        }
        const port = await previewServer.start();

        // 注册预览会话
        const previewId = previewServer.registerPreview(htmlContent, filePath);

        // 构建预览URL
        const previewUrl = previewServer.getPreviewUrl(previewId);

        // 在外部浏览器中打开（使用系统命令确保在外部浏览器打开）
        await openExternalBrowser(previewUrl);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : '';
        vscode.window.showErrorMessage(`Failed to preview markdown: ${errorMessage}`);
        console.error('Preview error:', error);
        console.error('Error stack:', errorStack);
        
        // 输出到输出面板以便调试
        const outputChannel = vscode.window.createOutputChannel('Markdown Preview');
        outputChannel.appendLine(`Error: ${errorMessage}`);
        if (errorStack) {
            outputChannel.appendLine(`Stack: ${errorStack}`);
        }
        outputChannel.show(true);
    }
}

/**
 * 使用系统默认浏览器打开 URL（各平台标准方式，无 hack）
 * 失败时回退到 vscode.env.openExternal。
 */
function openExternalBrowser(url: string): Promise<void> {
    const fallback = (): Thenable<boolean> =>
        vscode.env.openExternal(vscode.Uri.parse(url));

    return new Promise((resolve, reject) => {
        const platform = process.platform as string;
        const { command, args } = getOpenCommand(platform, url);

        if (!command) {
            fallback().then(() => resolve(), reject);
            return;
        }

        try {
            const child = child_process.spawn(command, args, {
                detached: true,
                stdio: 'ignore'
            });

            child.on('error', (err: NodeJS.ErrnoException) => {
                console.warn(`[Markdown Preview] open failed: ${err.message}, using fallback`);
                fallback().then(() => resolve(), reject);
            });

            child.unref();
            resolve();
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            console.warn(`[Markdown Preview] spawn failed: ${msg}, using fallback`);
            fallback().then(() => resolve(), reject);
        }
    });
}

/**
 * 各平台打开 URL 的标准命令（仅使用各 OS 官方/通用方式，无 hack）
 * - win32: start 为 cmd 内置，需通过 cmd /c 调用；第一个空串为窗口标题（start 语法要求）
 * - darwin: open 为系统命令
 * - linux/freebsd/openbsd/其他: xdg-open 为 freedesktop 标准，未安装时 spawn 失败会走 fallback
 */
function getOpenCommand(platform: string, url: string): { command: string | null; args: string[] } {
    switch (platform) {
        case 'win32':
            return { command: 'cmd', args: ['/c', 'start', '', url] };
        case 'darwin':
            return { command: 'open', args: [url] };
        case 'linux':
        case 'freebsd':
        case 'openbsd':
        default:
            return { command: 'xdg-open', args: [url] };
    }
}

/**
 * 加载配置
 */
function loadConfiguration(): void {
    const config = vscode.workspace.getConfiguration('markdownPreview');
    if (previewServer) {
        previewServer.updateConfig({
            port: config.get<number>('serverPort', 3000),
            maxSessions: config.get<number>('maxSessions', 50),
            sessionTimeout: config.get<number>('sessionTimeout', 30)
        });
    }
}

/**
 * 启动服务器
 */
async function startServer(): Promise<void> {
    try {
        if (!previewServer) {
            previewServer = PreviewServer.getInstance();
            loadConfiguration();
        }
        if (previewServer.isRunning()) {
            vscode.window.showInformationMessage('Preview server is already running.');
            return;
        }
        const port = await previewServer.start();
        vscode.window.showInformationMessage(`Preview server started on port ${port}`);
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        vscode.window.showErrorMessage(`Failed to start server: ${errorMessage}`);
    }
}

/**
 * 停止服务器
 */
function stopServer(): void {
    if (!previewServer || !previewServer.isRunning()) {
        vscode.window.showInformationMessage('Preview server is not running.');
        return;
    }
    previewServer.stop();
    vscode.window.showInformationMessage('Preview server stopped.');
}

/**
 * 重启服务器
 */
async function restartServer(): Promise<void> {
    if (previewServer && previewServer.isRunning()) {
        previewServer.stop();
        // 等待一下确保完全停止
        await new Promise(resolve => setTimeout(resolve, 500));
    }
    await startServer();
    vscode.window.showInformationMessage('Preview server restarted.');
}

/**
 * 显示服务器状态
 */
function showServerStatus(): void {
    if (!previewServer) {
        previewServer = PreviewServer.getInstance();
        loadConfiguration();
    }
    const status = previewServer.getStatus();
    const statusMessage = status.isRunning
        ? `Server Status:\n- Running: Yes\n- Port: ${status.port}\n- Active Sessions: ${status.sessionCount}/${status.maxSessions}`
        : `Server Status:\n- Running: No\n- Port: ${status.port}\n- Active Sessions: ${status.sessionCount}/${status.maxSessions}`;
    
    vscode.window.showInformationMessage(statusMessage);
}

/**
 * 扩展停用时调用
 */
export function deactivate() {
    if (previewServer) {
        previewServer.stop();
        previewServer = null;
    }
}
