import '@testing-library/jest-dom/vitest';

// jsdom 缺失的浏览器 API 补齐（仅测试环境）
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = () => 'blob:mock';
  URL.revokeObjectURL = () => undefined;
}

if (typeof File !== 'undefined' && typeof File.prototype.text !== 'function') {
  File.prototype.text = function text(this: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result ?? ''));
      reader.onerror = () => reject(reader.error);
      reader.readAsText(this);
    });
  };
}
