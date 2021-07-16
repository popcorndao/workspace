import Link from 'next/link';

interface NavbarLinkProps {
  label: string;
  url?: string;
  isActive: boolean;
  onClick?: Function;
  target?: string;
}

const NavbarLink: React.FC<NavbarLinkProps> = ({
  label,
  url,
  isActive,
  onClick,
  target,
}) => {
  const className = `
    font-medium 
    text-lg ${isActive ? 'text-indigo-500 font-bold' : 'text-gray-700'} 
    hover:text-indigo-500 cursor-pointer
  `;

  if (!url) {
    return (
      <a
        className={className}
        target={target || '_self'}
        onClick={(e) => {
          onClick && onClick();
        }}
      >
        {label}
      </a>
    );
  }

  return (
    <Link href={url || ''} passHref>
      <a
        className={className}
        target={target || '_self'}
        onClick={(e) => {
          onClick && onClick();
        }}
      >
        {label}
      </a>
    </Link>
  );
};
export default NavbarLink
