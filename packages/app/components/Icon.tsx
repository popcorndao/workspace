import { CheckIcon, XIcon } from '@heroicons/react/solid';
interface IconProps {
  type: 'check' | 'x';
}

const Icon: React.FC<IconProps> = ({ type }) => type === 'check' ? (
    <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500"/>
) : (
    <XIcon className="flex-shrink-0 h-6 w-6 text-red-500"/>
);
export default Icon
