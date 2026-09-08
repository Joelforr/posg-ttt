interface WaitingProps {
  message?: string;
  subtext?: string;
  onAction?: () => void; 
}

export const Waiting = (props: WaitingProps) => {
    const {message = 'Waiting for opponent', subtext = 'Match will start once both players are present', onAction} = props
    return (
    <div className="waiting-modal" role="status" aria-live="polite">
      <div className="waiting-orbit" aria-hidden="true">
        <div className="waiting-track" />
        <div className="waiting-orbit-cw">
          <div className="waiting-ball waiting-ball-you" />
        </div>
        <div className="waiting-orbit-ccw">
          <div className="waiting-ball waiting-ball-opponent" />
        </div>
      </div>
      <div className="waiting-text-block">
        <p className="waiting-text">
          {message}
          <span className="waiting-dots" aria-hidden="true">
            <span>.</span>
            <span>.</span>
            <span>.</span>
          </span>
        </p>
        <p className="waiting-subtext">{subtext}</p>
        <div className="mt-2">
            <button className={`primary rounded small bg-[rgba(255,255,255,0.8)] text-(--danger) border border-(--color-opponent-100)`} onClick={onAction}>Leave Room</button>
        </div>
      </div>
    </div>
  );
}