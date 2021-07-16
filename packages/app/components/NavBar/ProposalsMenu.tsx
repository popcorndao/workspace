import { useRouter } from 'next/router';
import NavbarLink from './NavbarLinks';
import * as Icon from 'react-feather';

interface ProposalsMenuProps {
  visible: boolean;
  toggleSubMenu: Function;
}

export const ProposalsMenu: React.FC<ProposalsMenuProps> = ({ visible, toggleSubMenu }) => {
  const router = useRouter();
  return visible && (
    <div className="absolute z-10 left-4/5 transform  -translate-x-1 mt-5 px-2 w-screen max-w-xs sm:px-0">
      <nav
        className="mx-auto px-4 py-8 bg-white rounded-lg shadow-lg ring-1 ring-black ring-opacity-5"
        aria-labelledby="solutionsHeading"
      >
        <div>
          <ul className="space-y-6">
            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <Icon.Info className="flex-shrink-0 h-6 w-6 mr-2 text-gray-400" />
                <NavbarLink
                  label="Beneficiary Nomination Proposals"
                  url="/proposals/nominations"
                  onClick={toggleSubMenu}
                  isActive={router.pathname === '/proposals/nominations'}
                />
              </span>
            </li>
            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <Icon.Info className="flex-shrink-0 h-6 w-6 mr-2 text-gray-400" />
                <NavbarLink
                  label="Beneficiary Takedown Proposals"
                  url="/proposals/takedowns"
                  onClick={toggleSubMenu}
                  isActive={
                    router.pathname === '/proposals/takedowns'
                  }
                />
              </span>
            </li>

            <li className="flow-root">
              <span className="-m-3 p-3 flex items-center text-base font-medium text-gray-900 hover:bg-gray-50 transition ease-in-out duration-150">
                <Icon.Plus className="flex-shrink-0 h-6 w-6 mr-2 text-gray-400" />
                <NavbarLink
                  label="Propose a New Beneficiary"
                  url="/proposals/propose"
                  onClick={toggleSubMenu}
                  isActive={
                    router.pathname === '/proposals/propose'
                  }
                />
              </span>
            </li>
          </ul>
        </div>
      </nav>
    </div>
  );
};
