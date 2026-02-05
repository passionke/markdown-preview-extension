import MarkdownIt from 'markdown-it';
import hljs from 'highlight.js';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Markdown渲染器
 * 支持完整的markdown语法、代码高亮、mermaid图表和表格
 */
export class MarkdownRenderer {
    private md: MarkdownIt;

    constructor() {
        // 初始化markdown-it实例
        this.md = new MarkdownIt({
            html: true,        // 允许HTML标签
            linkify: true,     // 自动转换URL为链接
            typographer: true, // 启用一些语言中性的替换 + 引号美化
            highlight: (str: string, lang: string) => {
                // 特殊处理 mermaid 代码块
                if (lang === 'mermaid') {
                    // 将 mermaid 代码转换为特殊的 div 标记，由浏览器端的 Mermaid.js 渲染
                    const escapedCode = this.md.utils.escapeHtml(str);
                    return `<div class="mermaid">${escapedCode}</div>`;
                }
                
                // 代码高亮处理
                if (lang && hljs.getLanguage && hljs.getLanguage(lang)) {
                    try {
                        const highlighted = hljs.highlight(str, { language: lang });
                        return `<pre class="hljs"><code>${highlighted.value}</code></pre>`;
                    } catch (err) {
                        // 如果高亮失败，返回转义的代码
                        return `<pre class="hljs"><code>${this.md.utils.escapeHtml(str)}</code></pre>`;
                    }
                }
                // 如果没有指定语言或语言不支持，尝试自动检测
                try {
                    if (hljs.highlightAuto) {
                        const highlighted = hljs.highlightAuto(str);
                        return `<pre class="hljs"><code>${highlighted.value}</code></pre>`;
                    }
                } catch (err) {
                    // 如果自动检测也失败，返回转义的代码
                }
                // 最后兜底：返回转义的代码
                return `<pre class="hljs"><code>${this.md.utils.escapeHtml(str)}</code></pre>`;
            }
        });
    }

    /**
     * 渲染markdown内容为HTML
     * @param markdownContent markdown文本内容
     * @returns 完整的HTML文档字符串
     */
    public render(markdownContent: string): string {
        // 使用markdown-it渲染markdown内容
        const htmlContent = this.md.render(markdownContent);

        // 使用内联模板（避免打包后文件路径问题）
        const template = this.getDefaultTemplate();

        // 替换模板中的内容占位符
        const finalHtml = template.replace('{{CONTENT}}', htmlContent);

        return finalHtml;
    }

    /**
     * 获取默认HTML模板
     */
    private getDefaultTemplate(): string {
        return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Markdown Preview</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/styles/github.min.css">
    <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #fff;
            padding: 20px;
            max-width: 1200px;
            margin: 0 auto;
        }
        h1, h2, h3, h4, h5, h6 { margin-top: 24px; margin-bottom: 16px; font-weight: 600; line-height: 1.25; }
        h1 { font-size: 2em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h2 { font-size: 1.5em; border-bottom: 1px solid #eaecef; padding-bottom: 0.3em; }
        h3 { font-size: 1.25em; }
        p { margin-bottom: 16px; }
        ul, ol { margin-bottom: 16px; padding-left: 2em; }
        blockquote { padding: 0 1em; color: #6a737d; border-left: 0.25em solid #dfe2e5; margin-bottom: 16px; }
        code { padding: 0.2em 0.4em; margin: 0; font-size: 85%; background-color: rgba(27, 31, 35, 0.05); border-radius: 3px; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; }
        pre { padding: 16px; overflow: auto; font-size: 85%; line-height: 1.45; background-color: #f6f8fa; border-radius: 6px; margin-bottom: 16px; }
        pre code { display: inline; padding: 0; margin: 0; overflow: visible; line-height: inherit; word-wrap: normal; background-color: transparent; border: 0; }
        table { border-collapse: collapse; border-spacing: 0; width: 100%; margin-bottom: 16px; display: block; overflow-x: auto; }
        table th, table td { padding: 6px 13px; border: 1px solid #dfe2e5; }
        table th { font-weight: 600; background-color: #f6f8fa; }
        table tr:nth-child(2n) { background-color: #f6f8fa; }
        a { color: #0366d6; text-decoration: none; }
        a:hover { text-decoration: underline; }
        img { max-width: 100%; height: auto; margin-bottom: 16px; }
        hr { height: 0.25em; padding: 0; margin: 24px 0; background-color: #e1e4e8; border: 0; }
        .mermaid { text-align: center; margin: 20px 0; }
        .hljs { display: block; overflow-x: auto; padding: 16px; background: #f6f8fa; }
    </style>
</head>
<body>
    <div id="markdown-content">{{CONTENT}}</div>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.9.0/highlight.min.js"></script>
    <script>
        mermaid.initialize({ startOnLoad: true, theme: 'default', securityLevel: 'loose' });
        document.addEventListener('DOMContentLoaded', function() {
            document.querySelectorAll('pre code').forEach((block) => { hljs.highlightElement(block); });
            mermaid.run();
        });
    </script>
</body>
</html>`;
    }
}
