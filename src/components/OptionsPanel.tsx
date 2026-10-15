import { Button, Collapsible, Select, Slider } from '@/components';
import { SealCharsetPanel } from '@/components/SealCharsetPanel';
import { LiCharsetPanel } from '@/components/LiCharsetPanel';
import { FONT_CATALOG } from '@/lib/fonts';
import { CARRIER_ORDER, getCarrierPlugin } from '@/engine/carrier';
import { useSettingsStore } from '@/store/settings';
import { useT } from '@/lib/useI18n';
import type { CarrierType, FontFamily, ProjectOptions } from '@/db/types';

export interface OptionsPanelProps {
  options: ProjectOptions;
  onChange: (patch: Partial<ProjectOptions>) => void;
  /** V2-C5 N5.2：受控的展开分组集合（由外层持有，跨渲染保持） */
  openGroups?: Record<string, boolean>;
  onToggleGroup?: (key: OptionGroupKey, open: boolean) => void;
}

const PAPER_BG = '#f4ecd8';
const BAMBOO_BG = '#c9b083';

/** V2-C7 C6：各载体的推荐底色（切换载体时同步）。 */
export const CARRIER_DEFAULT_BG: Record<CarrierType, string> = {
  paper: '#f4ecd8',
  scroll: '#f6efdc',
  handscroll: '#f3ead4',
  silk: '#efe6cf',
  letter: '#f7f1de',
  gold: '#f2e7c9',
  bamboo: '#c9b083',
  wood: '#c8a670',
  rubbing: '#3a3632',
  fan: '#f4ecd8',
};

/** 载体默认底色（未列出时回退宣纸色）。 */
export function carrierBg(type: CarrierType): string {
  return CARRIER_DEFAULT_BG[type] ?? PAPER_BG;
}

/** 参数分组键（V2-C5 N5.2：手风琴折叠后仍可被外部记忆） */
export const OPTION_GROUPS = ['carrier', 'font', 'write', 'scroll', 'canvas', 'animation'] as const;
export type OptionGroupKey = (typeof OPTION_GROUPS)[number];

/**
 * N3.4 参数面板：载体 / 字体 / 书写 / 滚动 / 背景色 / 画布规格（IM-UI-001 §6.2.5）。
 * V2-C5 N5.2：六个分组全部改为**手风琴折叠**，标题右侧显示当前取值摘要，
 * 使 320px 窄栏下的信息密度可控；受限字库提示内联到「字体」分组低位而非独立大块。
 */
export function OptionsPanel({
  options: opt,
  onChange,
  openGroups,
  onToggleGroup,
}: OptionsPanelProps) {
  const t = useT();
  const fonts = useSettingsStore((s) => s.fonts);
  // V2-C2 N2.3：描边动画仅对受限字库路径（小篆/隶书）可用；V2-C4 N4.1：自定义字体走整字路径，不适用
  const isRestrictedFamily =
    !opt.customFontId && (opt.fontFamily === 'seal' || opt.fontFamily === 'li');

  // V2-C4 N4.1：字体下拉分「内置字体」「我的字体」两组。
  // 自定义字体以 `custom:<id>` 作为选中值；未选中时值为内置 family。
  const uploadedFonts = fonts.filter((f) => f.source === 'uploaded');
  const fontOptions = [
    ...FONT_CATALOG.map((f) => ({
      value: f.family as string,
      label: t(f.labelKey),
      group: t('font.groupBuiltin'),
    })),
    ...uploadedFonts.map((f) => ({
      value: `custom:${f.id}`,
      label: f.name,
      group: t('font.groupMine'),
    })),
  ];
  const fontValue = opt.customFontId ? `custom:${opt.customFontId}` : opt.fontFamily;

  // V2-C5 N5.2：标题摘要——收起时也能读到当前取值
  // V2-C7 C6：载体名从注册表读（10 种），不再硬编码两分支
  const carrierLabel = t(`options.carrier.${opt.carrier}`);
  const carrierPlugin = getCarrierPlugin(opt.carrier);
  const currentFontLabel = opt.customFontId
    ? (uploadedFonts.find((f) => f.id === opt.customFontId)?.name ?? t('font.groupMine'))
    : t(FONT_CATALOG.find((f) => f.family === opt.fontFamily)?.labelKey ?? 'options.font.kai');
  const canvasLabel = `${opt.width}×${opt.height}`;
  const outlineLabel = opt.outlineAnimation ? t('options.on') : t('options.off');

  const grp = (key: OptionGroupKey) => ({
    open: openGroups?.[key],
    onToggle: (open: boolean) => onToggleGroup?.(key, open),
  });

  return (
    <div className="im-options">
      <Collapsible
        title={t('options.carrierLegend')}
        groupKey="carrier"
        legacyFieldset
        summary={carrierLabel}
        defaultOpen
        {...grp('carrier')}
      >
        <Select
          label={t('options.carrierStyle')}
          value={opt.carrier}
          options={CARRIER_ORDER.map((c) => ({
            value: c,
            label: t(`options.carrier.${c}`),
          }))}
          onChange={(v) => {
            const carrier = v as CarrierType;
            // 切换载体时同步推荐背景色（V2-C7 C6：按载体各自的推荐底色）
            onChange({ carrier, backgroundColor: carrierBg(carrier) });
          }}
        />
        <label className="im-options__color">
          <span>{t('options.carrierBg')}</span>
          <input
            type="color"
            value={opt.backgroundColor}
            onChange={(e) => onChange({ backgroundColor: e.target.value })}
            aria-label={t('options.carrierBg')}
          />
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ backgroundColor: carrierBg(opt.carrier) })}
          >
            {t('options.reset')}
          </Button>
        </label>
        {/* V2-C7 C6：载体观感参数（色温 / 做旧 / 装裱边 / 钤印位） */}
        <div className="im-options__group">
          <label className="im-options__slider">
            <span>{t('options.carrierWarmth')}</span>
            <Slider
              min={-1}
              max={1}
              step={0.05}
              value={opt.warmth ?? 0}
              onChange={(v) => onChange({ warmth: v })}
              aria-label={t('options.carrierWarmth')}
            />
            <span className="im-options__value">{(opt.warmth ?? 0).toFixed(2)}</span>
          </label>
          <label className="im-options__slider">
            <span>{t('options.carrierAging')}</span>
            <Slider
              min={0}
              max={1}
              step={0.05}
              value={opt.aging ?? 0.35}
              onChange={(v) => onChange({ aging: v })}
              aria-label={t('options.carrierAging')}
            />
            <span className="im-options__value">{(opt.aging ?? 0.35).toFixed(2)}</span>
          </label>
          {carrierPlugin.supportsMount && (
            <label className="im-options__slider">
              <span>{t('options.carrierMount')}</span>
              <Slider
                min={0}
                max={0.15}
                step={0.005}
                value={opt.mountRatio ?? 0.075}
                onChange={(v) => onChange({ mountRatio: v })}
                aria-label={t('options.carrierMount')}
              />
              <span className="im-options__value">
                {Math.round((opt.mountRatio ?? 0.075) * 1000) / 10}%
              </span>
            </label>
          )}
          <Select
            label={t('options.carrierSeal')}
            value={opt.sealPos ?? 'none'}
            options={[
              { value: 'none', label: t('options.seal.none') },
              { value: 'tr', label: t('options.seal.tr') },
              { value: 'br', label: t('options.seal.br') },
              { value: 'bl', label: t('options.seal.bl') },
              { value: 'tl', label: t('options.seal.tl') },
            ]}
            onChange={(v) =>
              onChange({ sealPos: v as 'none' | 'tr' | 'br' | 'bl' | 'tl' })
            }
          />
        </div>
      </Collapsible>

      <Collapsible
        title={t('options.fontLegend')}
        groupKey="font"
        legacyFieldset
        summary={currentFontLabel}
        tone={isRestrictedFamily ? 'warn' : 'default'}
        defaultOpen
        {...grp('font')}
      >
        <Select
          label={t('options.font')}
          value={fontValue}
          options={fontOptions}
          onChange={(v) => {
            // V2-C4 N4.1：`custom:<id>` → 写入 customFontId；否则写入内置 family 并清除自定义
            if (v.startsWith('custom:')) {
              onChange({ customFontId: v.slice('custom:'.length) });
            } else {
              onChange({ fontFamily: v as FontFamily, customFontId: undefined });
            }
          }}
          hint={t('options.fontHint')}
        />
        {/* V2-C5 N5.2：受限字库提示内联到低位（紧贴字体选择器下方） */}
        <div className="im-options__inner">
          {!opt.customFontId && opt.fontFamily === 'seal' && <SealCharsetPanel text={''} />}
          {!opt.customFontId && opt.fontFamily === 'li' && <LiCharsetPanel text={''} />}
        </div>
        <label className="im-options__color">
          <span>{t('options.ink')}</span>
          <input
            type="color"
            value={opt.strokeColor}
            onChange={(e) => onChange({ strokeColor: e.target.value })}
            aria-label={t('options.ink')}
          />
          <Button variant="ghost" size="sm" onClick={() => onChange({ strokeColor: '#1c1a17' })}>
            {t('options.reset')}
          </Button>
        </label>
      </Collapsible>

      <Collapsible
        title={t('options.writeLegend')}
        groupKey="write"
        legacyFieldset
        summary={`${opt.fontSize}px · ${opt.writingSpeed.toFixed(1)}×`}
        defaultOpen
        {...grp('write')}
      >
        <Slider
          label={t('options.fontSize')}
          min={48}
          max={160}
          step={4}
          value={opt.fontSize}
          unit="px"
          onChange={(v) => onChange({ fontSize: v })}
        />
        <Slider
          label={t('options.speed')}
          min={0.5}
          max={3}
          step={0.1}
          value={opt.writingSpeed}
          format={(v) => `${v.toFixed(1)}×`}
          onChange={(v) => onChange({ writingSpeed: v })}
        />
      </Collapsible>

      <Collapsible
        title={t('options.scrollLegend')}
        groupKey="scroll"
        legacyFieldset
        summary={opt.scrollEnabled ? t('options.on') : t('options.off')}
        {...grp('scroll')}
      >
        <label className="im-options__check">
          <input
            type="checkbox"
            checked={opt.scrollEnabled}
            onChange={(e) => onChange({ scrollEnabled: e.target.checked })}
          />
          {t('options.scrollAuto')}
        </label>
      </Collapsible>

      <Collapsible
        title={t('options.canvasLegend')}
        groupKey="canvas"
        legacyFieldset
        summary={`${canvasLabel} · ${opt.framerate}fps`}
        {...grp('canvas')}
      >
        <Select
          label={t('options.canvasSpec')}
          value={`${opt.width}x${opt.height}`}
          options={[
            { value: '1080x1920', label: t('options.canvas.1080') },
            { value: '720x1280', label: t('options.canvas.720') },
            { value: '1920x1080', label: t('options.canvas.1920') },
            { value: '2160x3840', label: t('options.canvas.2160') },
          ]}
          onChange={(v) => {
            const [w, h] = v.split('x').map(Number);
            onChange({ width: w, height: h });
          }}
        />
        {opt.width * opt.height >= 2160 * 3840 && (
          <p className="im-options__note im-options__note--warn" role="status">
            {t('options.canvas4kWarn', {
              mb: ((opt.width * opt.height * 4) / 1024 / 1024).toFixed(0),
            })}
          </p>
        )}
        <Slider
          label={t('options.framerate')}
          min={24}
          max={60}
          step={1}
          value={opt.framerate}
          unit=" fps"
          onChange={(v) => onChange({ framerate: v })}
        />
        <p className="im-options__note">{t('options.canvasNote')}</p>
      </Collapsible>

      {/* V2-C2 N2.3：动画分组（必须置于末尾，保证字体/画布分组的选择器顺序稳定） */}
      <Collapsible
        title={t('options.animationLegend')}
        groupKey="animation"
        legacyFieldset
        summary={outlineLabel}
        tone={isRestrictedFamily && !opt.outlineAnimation ? 'warn' : 'default'}
        {...grp('animation')}
      >
        <label className="im-options__check">
          <input
            type="checkbox"
            checked={!!opt.outlineAnimation}
            disabled={!isRestrictedFamily}
            onChange={(e) => onChange({ outlineAnimation: e.target.checked })}
          />
          {t('options.animation.outline')}
        </label>
        <p className="im-options__note">
          {isRestrictedFamily
            ? t('options.animation.outline.tip')
            : t('options.animation.outline.disabled')}
        </p>
      </Collapsible>
    </div>
  );
}

export { PAPER_BG, BAMBOO_BG };
