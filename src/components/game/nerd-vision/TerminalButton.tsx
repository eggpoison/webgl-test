interface TerminalButtonProps {
   readonly isOpened: boolean;
   readonly onClick: () => void;
}

const TerminalButton = ({ isOpened, onClick }: TerminalButtonProps) => {
   return <button id="terminal-button" onClick={() => onClick()} className={isOpened ? "opened" : undefined}>
      Terminal
   </button>;
}

export default TerminalButton;