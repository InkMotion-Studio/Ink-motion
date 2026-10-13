import { Button, Select, Slider } from '@/components';
import type { CarrierType, FontFamily, ProjectOptions } from '@/db/types';

export interface OptionsPanelProps {
  options: ProjectOptions;
  onChange: (patch: Partial<ProjectOptions>) => void;
}

const PAPER_BG = '#f4ecd8';
const BAMBOO_BG = '#c9b083';

/** N3.4 参数面板：载体 / 字体 / 书写 / 滚动 / 背景色 / 画布规格（IM-UI-001 §6.2.5）。 */
export function OptionsPanel({ options: opt, onChange }: OptionsPanelProps) {
  return (
    <div className="im-options">
      <fieldset className="im-options__group">
        <legend>载体</legend>
        <Select
          label="载体样式"
          value={opt.carrier}
          options={[
            { value: 'paper', label: '宣纸卷轴' },
            { value: 'bamboo', label: '竹简' },
          ]}
          onChange={(v) => {
            const carrier = v as CarrierType;
            // 切换载体时同步推荐背景色
            onChange({ carrier, backgroundColor: carrier === 'bamboo' ? BAMBOO_BG : PAPER_BG });
          }}
        />
        <label className="im-options__color">
          <span>载体底色</span>
          <input
            type="color"
            value={opt.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            aria-label="载体底色"
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ backgroundColor: opt.carrier === 'bamboo' ? BAMBOO_BG : PAPER_BG })}
          >
            复位
          </Button>
        </label>
      </fieldset>

      <fieldset className="im-options__group">
        <legend>字体</legend>
        <Select
          label="字体路径"
          value={opt.fontFamily}
          options={[
            { value: 'kai', label: '楷体（精确笔顺）' },
            { value: 'song', label: '宋体（整字显现）' },
          ]}
          onChange={(v) => onChange({ fontFamily: v as FontFamily })}
          hint="古文字路径受字体资产阻塞，暂不可用（IM-RISK-001 R-01）"
        />
        <label className="im-options__color">
          <span>墨色</span>
          <input
            type="color"
            value={opt.strokeColor}
            onChange={(e) => onChange({ strokeColor: e.target.value })}
            aria-label="墨色"
          />
          <Button variant="ghost" size="sm" onClick={() => onChange({ strokeColor: '#1c1a17' })}>
            复位
          </Button>
        </label>
      </fieldset>

      <fieldset className="im-options__group">
        <legend>书写</legend>
        <Slider
          label="单字尺寸"
          min={48}
          max={160}
          step={4}
          value={opt.fontSize}
          unit="px"
          onChange={(v) => onChange({ fontSize: v })}
        />
        <Slider
          label="书写速度"
          min={0.5}
          max={3}
          step={0.1}
          value={opt.writingSpeed}
          format={(v) => `${v.toFixed(1)}×`}
          onChange={(v) => onChange({ writingSpeed: v })}
        />
      </fieldset>

      <fieldset className="im-options__group">
        <legend>滚动</legend>
        <label className="im-options__check">
          <input
            type="checkbox"
            checked={opt.scrollEnabled}
            onChange={(e) => onChange({ scrollEnabled: e.target.checked })}
          />
          自动滚动（长文书写时跟随）
        </label>
      </fieldset>

      <fieldset className="im-options__group">
        <legend>画布与导出</legend>
        <Select
          label="画布规格"
          value={`${opt.width}x${opt.height}`}
          options={[
            { value: '1080x1920', label: '1080 × 1920（竖屏 9:16）' },
            { value: '720x1280', label: '720 × 1280（竖屏 9:16 轻量）' },
            { value: '1920x1080', label: '1920 × 1080（横屏 16:9，实验）' },
          ]}
          onChange={(v) => {
            const [w, h] = v.split('x').map(Number);
            onChange({ width: w, height: h });
          }}
        />
        <Slider
          label="导出帧率"
          min={24}
          max={60}
          step={1}
          value={opt.framerate}
          unit=" fps"
          onChange={(v) => onChange({ framerate: v })}
        />
        <p className="im-options__note">画布宽高由规格决定；帧率影响导出流畅度与体积。</p>
      </fieldset>
    </div>
  );
}

export { PAPER_BG, BAMBOO_BG };
