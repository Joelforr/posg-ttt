interface ErrorScreenProps {
    code: string,
    title: string;
    subtitle: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
}

export const ErrorScreen = (props : ErrorScreenProps) => {
    const {code, title, subtitle, message, actionLabel, onAction} = props
    const isMuted = code === "404";

    return (
    <div className="error-screen flex justify-center items-center h-screen">
        <div className="flex flex-col">
            <div className="flex flex-col items-center gap-2 p-[28px_24px_22px] border-b">
                <span className={`text-error-code ${isMuted ? 'text-(--muted)' : 'text-(--danger)'}`}>{code}</span>
                <div className={`error-badge ${isMuted ? 'bg-[rgba(0,0,0,0.06)]' : 'bg-(--color-opponent-100)'} ${isMuted ? 'text-(--muted)' : 'text-(--danger)'} `}>{subtitle}</div>
            </div>
            
            <div className="flex flex-col flex-1 gap-2 p-[22px_22px_18px]">
                <h2 className="text-error-title">{title}</h2>
                    <p>{message}</p>
                {actionLabel && onAction && (
                    <button className={`primary rounded ${isMuted ? 'bg-(--btn-primary-enabled)' : 'bg-(--danger)'} text-white font-semibold`} onClick={onAction}>{actionLabel}</button>
                )}
            </div>            
        </div>
    </div>
  );
}