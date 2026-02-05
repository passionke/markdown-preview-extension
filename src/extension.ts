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
 * 在外部浏览器中打开URL
 * @param url 要打开的URL
 */
function openExternalBrowser(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const platform = process.platform;
        let command: string;

        // 根据操作系统选择命令
        if (platform === 'darwin') {
            // macOS
            command = 'open';
        } else if (platform === 'win32') {
            // Windows
            command = 'start';
        } else {
            // Linux 和其他 Unix 系统
            command = 'xdg-open';
        }

        // 执行命令打开浏览器
        const child = child_process.spawn(command, [url], {
            detached: true,
            stdio: 'ignore'
        });

        child.on('error', (error) => {
            // 如果系统命令失败，回退到 vscode.env.openExternal
            console.warn(`Failed to open browser with system command: ${error.message}`);
            vscode.env.openExternal(vscode.Uri.parse(url)).then(
                () => resolve(),
                (err) => reject(err)
            );
        });

        child.unref(); // 允许父进程退出而不等待子进程
        resolve();
    });
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
