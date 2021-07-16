interface MainActionButtonProps {
  label: string;
  handleClick: any;
  disabled?: boolean;
}

const MainActionButton: React.FC<MainActionButtonProps> = ({
  label,
  handleClick,
  disabled = false,
}) => {
  return (
      <button
          type="button"
          className="button button-primary w-full"
          onClick={handleClick}
          disabled={disabled}
      >
        {label}
      </button>
  );
};
export default MainActionButton
