type Props = {
  open: boolean;
  text: string;
  onOk: () => void;
  onAnother: () => void;
};

export default function LongBreakPrompt({ open, text, onOk, onAnother }: Props) {
  if (!open) return null;

  return (
    <div className="lbOverlay" role="dialog" aria-modal="true" aria-label="Long break reminder">
      <div className="lbModal">
        <div className="lbTitle">Long break reminder</div>
        <div className="lbText">{text}</div>

        <div className="lbActions">
          <button className="btn" type="button" onClick={onAnother}>
            Another
          </button>
          <button className="btn primary" type="button" onClick={onOk}>
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
