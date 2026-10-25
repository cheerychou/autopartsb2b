import { useState, useCallback } from 'react';

export interface PrintOptions {
  documentType: string;
  documentId: string;
  documentNumber?: string;
  title?: string;
  onBeforePrint?: () => Promise<void> | void;
  onAfterPrint?: () => void;
  onError?: (error: Error) => void;
}

export interface UsePrintReturn {
  printing: boolean;
  printDocument: (options: PrintOptions) => Promise<void>;
  printPreview: (options: PrintOptions) => Promise<void>;
}

/**
 * 打印功能 Hook
 * 标准化单据类详情页的打印功能
 */
export function usePrint(): UsePrintReturn {
  const [printing, setPrinting] = useState(false);

  const printDocument = useCallback(async (options: PrintOptions) => {
    const {
      documentType,
      documentId,
      documentNumber,
      title,
      onBeforePrint,
      onAfterPrint,
      onError,
    } = options;

    setPrinting(true);

    try {
      if (onBeforePrint) {
        await onBeforePrint();
      }

      const printTitle = title || `${documentType} - ${documentNumber || documentId}`;

      const printWindow = window.open('', '_blank');
      if (!printWindow) {
        throw new Error('无法打开打印窗口，请检查浏览器弹窗设置');
      }

      const printContent = document.getElementById('print-content');
      if (!printContent) {
        printWindow.close();
        throw new Error('未找到打印内容区域');
      }

      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${printTitle}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 12px;
                line-height: 1.5;
                color: #333;
                padding: 20px;
              }
              .print-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #333;
              }
              .print-header h1 {
                font-size: 18px;
                font-weight: 600;
              }
              .print-header .subtitle {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
                font-weight: 600;
              }
              .print-footer {
                margin-top: 30px;
                text-align: center;
                font-size: 10px;
                color: #999;
              }
              @media print {
                body {
                  padding: 0;
                }
                .no-print {
                  display: none !important;
                }
              }
            </style>
          </head>
          <body>
            <div class="print-header">
              <h1>${printTitle}</h1>
              <div class="subtitle">打印时间: ${new Date().toLocaleString('zh-CN')}</div>
            </div>
            ${printContent.innerHTML}
            <div class="print-footer">
              <p>本文档由系统自动生成</p>
            </div>
          </body>
        </html>
      `);

      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      printWindow.close();

      if (onAfterPrint) {
        onAfterPrint();
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('打印失败');
      onError?.(error);
      console.error('打印失败:', error);
    } finally {
      setPrinting(false);
    }
  }, []);

  const printPreview = useCallback(async (options: PrintOptions) => {
    const {
      documentType,
      documentId,
      documentNumber,
      title,
      onBeforePrint,
      onError,
    } = options;

    try {
      if (onBeforePrint) {
        await onBeforePrint();
      }

      const previewTitle = title || `${documentType}预览 - ${documentNumber || documentId}`;

      const previewWindow = window.open('', '_blank');
      if (!previewWindow) {
        throw new Error('无法打开预览窗口，请检查浏览器弹窗设置');
      }

      const printContent = document.getElementById('print-content');
      if (!printContent) {
        previewWindow.close();
        throw new Error('未找到打印内容区域');
      }

      previewWindow.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <title>${previewTitle}</title>
            <style>
              * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
              }
              body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 12px;
                line-height: 1.5;
                color: #333;
                padding: 20px;
                background: #f0f0f0;
              }
              .preview-container {
                max-width: 800px;
                margin: 0 auto;
                background: white;
                padding: 40px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
              }
              .preview-toolbar {
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                background: #333;
                color: white;
                padding: 10px 20px;
                display: flex;
                justify-content: space-between;
                align-items: center;
                z-index: 1000;
              }
              .preview-toolbar button {
                background: white;
                border: none;
                padding: 8px 16px;
                cursor: pointer;
                border-radius: 4px;
                font-size: 14px;
              }
              .preview-toolbar button:hover {
                background: #f0f0f0;
              }
              .content-wrapper {
                margin-top: 60px;
              }
              .print-header {
                text-align: center;
                margin-bottom: 20px;
                padding-bottom: 10px;
                border-bottom: 2px solid #333;
              }
              .print-header h1 {
                font-size: 18px;
                font-weight: 600;
              }
              .print-header .subtitle {
                font-size: 14px;
                color: #666;
                margin-top: 5px;
              }
              table {
                width: 100%;
                border-collapse: collapse;
                margin: 10px 0;
              }
              th, td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
                font-weight: 600;
              }
              @media print {
                .preview-toolbar {
                  display: none !important;
                }
                body {
                  background: white;
                  padding: 0;
                }
                .preview-container {
                  box-shadow: none;
                  padding: 20px;
                }
                .content-wrapper {
                  margin-top: 0;
                }
              }
            </style>
          </head>
          <body>
            <div class="preview-toolbar">
              <span>${previewTitle}</span>
              <div>
                <button onclick="window.print()">打印</button>
                <button onclick="window.close()" style="margin-left: 10px;">关闭</button>
              </div>
            </div>
            <div class="content-wrapper">
              <div class="preview-container">
                <div class="print-header">
                  <h1>${previewTitle}</h1>
                  <div class="subtitle">生成时间: ${new Date().toLocaleString('zh-CN')}</div>
                </div>
                ${printContent.innerHTML}
              </div>
            </div>
          </body>
        </html>
      `);

      previewWindow.document.close();
    } catch (err) {
      const error = err instanceof Error ? err : new Error('预览失败');
      onError?.(error);
      console.error('预览失败:', error);
    }
  }, []);

  return {
    printing,
    printDocument,
    printPreview,
  };
}

export interface UsePrintTemplateOptions {
  templateId: string;
  getTemplateData: () => Record<string, any>;
}

export interface UsePrintTemplateReturn {
  loading: boolean;
  renderTemplate: (templateId: string, data: Record<string, any>) => string;
}

/**
 * 打印模板 Hook
 * 用于处理复杂的打印模板渲染
 */
export function usePrintTemplate(): UsePrintTemplateReturn {
  const [loading, setLoading] = useState(false);

  const renderTemplate = useCallback((templateId: string, data: Record<string, any>): string => {
    setLoading(true);
    try {
      let template = getTemplate(templateId);
      
      Object.keys(data).forEach((key) => {
        const placeholder = `{{${key}}}`;
        const value = data[key];
        template = template.replace(new RegExp(placeholder, 'g'), String(value ?? ''));
      });

      return template;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    renderTemplate,
  };
}

function getTemplate(templateId: string): string {
  const templates: Record<string, string> = {
    'order': `
      <div class="order-info">
        <p>订单编号: {{orderNumber}}</p>
        <p>客户名称: {{customerName}}</p>
        <p>订单金额: {{totalAmount}}</p>
      </div>
    `,
    'invoice': `
      <div class="invoice-info">
        <p>发票编号: {{invoiceNumber}}</p>
        <p>开票日期: {{invoiceDate}}</p>
        <p>金额: {{amount}}</p>
      </div>
    `,
  };

  return templates[templateId] || '<div>未找到打印模板</div>';
}
