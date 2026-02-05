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

    // 注册命令
    const disposable = vscode.commands.registerCommand(
        'markdownPreview.previewInBrowser',
        async () => {
            await previewMarkdownInBrowser();
        }
    );

    context.subscriptions.push(disposable);

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
 * 扩展停用时调用
 */
export function deactivate() {
    if (previewServer) {
        previewServer.stop();
        previewServer = null;
    }
}
