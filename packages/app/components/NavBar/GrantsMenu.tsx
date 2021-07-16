import {
  InformationCircleIcon,
  OfficeBuildingIcon,
} from '@heroicons/react/outline';
import { useRouter } from 'next/router';
import NavbarLink from './NavbarLinks';

interface GrantsMenuProps {
  visible: boolean;
  toggleSubMenu: Function;
}
export const GrantsMenu: React.FC<GrantsMenuProps> = ({ visible, toggleSubMenu }) => {
  const router = useRouter();
  if (!visible) return <></>;
  return (
    <div className="absolute z-10  transform  -translate-x-1 mt-5 px-2 w-screen max-w-xs sm:px-0">
      <nav
        className="mx-auto px-4 py-8 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5"
        aria-labelledby="solutionsHeading"
      >
        <div>
          <ul className="space-y-6">
            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <InformationCircleIcon className="flex-shrink-0 h-6 w-6 text-gray-400" />
                <span className="ml-4">
                  <NavbarLink
                    label="View All Elections"
                    url="/grant-elections/all"
                    onClick={toggleSubMenu}
                    isActive={router.pathname === '/grants'}
                  />
                </span>
              </span>
            </li>
            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <InformationCircleIcon className="flex-shrink-0 h-6 w-6 text-gray-400" />
                <span className="ml-4">
                  <NavbarLink
                    label="Monthly Election"
                    url="/grant-elections/monthly"
                    onClick={toggleSubMenu}
                    isActive={router.pathname === '/grants'}
                  />
                </span>
              </span>
            </li>
            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <InformationCircleIcon className="flex-shrink-0 h-6 w-6 text-gray-400" />
                <span className="ml-4">
                  <NavbarLink
                    label="Quarterly Election"
                    url="/grant-elections/quarterly"
                    onClick={toggleSubMenu}
                    isActive={router.pathname === '/grants'}
                  />
                </span>
              </span>
            </li>
            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <InformationCircleIcon className="flex-shrink-0 h-6 w-6 text-gray-400" />
                <span className="ml-4">
                  <NavbarLink
                    label="Yearly Election"
                    url="/grant-elections/yearly"
                    onClick={toggleSubMenu}
                    isActive={router.pathname === '/grants'}
                  />
                </span>
              </span>
            </li>

            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <OfficeBuildingIcon className="flex-shrink-0 h-6 w-6 text-gray-400" />
                <span className="ml-4">
                  <NavbarLink
                    label="Register for a Grant Election"
                    url="/grant-elections/register"
                    onClick={toggleSubMenu}
                    isActive={router.pathname === '/grant-elections/register'}
                  />
                </span>
              </span>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
};
