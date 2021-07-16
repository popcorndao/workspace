import { CheckIcon, XIcon } from '@heroicons/react/solid';
interface IconProps {
  type: 'check' | 'x';
}

export default function Icon({ type }: IconProps): JSX.Element {
  return type === 'check' ? (
    <CheckIcon className="flex-shrink-0 h-6 w-6 text-green-500" />
  ) : (
    <XIcon className="flex-shrink-0 h-6 w-6 text-red-500" />
  );
}
