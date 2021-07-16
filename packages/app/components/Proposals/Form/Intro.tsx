import {
  ChatAltIcon,
  CurrencyEuroIcon,
  DocumentReportIcon,
  HeartIcon,
  HomeIcon,
  InboxIcon,
  PencilAltIcon,
  PhotographIcon,
  SparklesIcon,
} from '@heroicons/react/outline';
import { defaultFormData, FormStepProps } from 'pages/proposals/propose';
import { InfoIconWithModal } from './../../InfoIconWithModal';

export default function Intro({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [formData, setFormData] = form;
  const { currentStep, setCurrentStep, stepLimit, setStepLimit } = navigation;

  const requirements = [
    {
      name: (
        <div>
          A connected wallet{' '}
          <InfoIconWithModal title="What's a wallet?">
            <div>
              A crypto wallet is a piece of software that is able to transact
              with blockchains. Wallets let holders store and trade various
              cryptocurrencies and tokens. The most common ways to connect
              wallets are through browser extensions such as{' '}
              <a
                href="https://metamask.io/"
                target="_window"
                className="text-blue-500"
              >
                MetaMask
              </a>{' '}
              on desktop or by visiting from a dApp browser on mobile.
            </div>
          </InfoIconWithModal>
        </div>
      ),
      description:
        'This is a decentralized application which requires a wallet ',
      icon: InboxIcon,
    },
    {
      name: (
        <div>
          2000 POP tokens
          <InfoIconWithModal
            title="What are POP tokens?"
            content="POP tokens are used by PopcornDAO - a decentralized autonomous organization. POP token holders
                  are able to submit and vote on proposals, grants, smart contract parameters and generally influence the direction of Popcorn."
          ></InfoIconWithModal>
        </div>
      ),
      description:
        'An organization wishing to submit an application to receive grants must have at least 2000 POP tokens, but they may reach out to the Popcorn Foundation to seek a nomination at no cost.',
      icon: CurrencyEuroIcon,
    },
    {
      name: 'A mission statement',
      description:
        "Here's your chance to tell the world why you should receive grant funding and how you'll be making an impact",
      icon: PencilAltIcon,
    },
    {
      name: 'An Ethereum Address',
      description: 'Grant funds will be claimable by this address only',
      icon: HomeIcon,
    },
    {
      name: 'Impact reports and/or audited documents',
      description:
        'Impact reports help instill trust so funders know that funds are being put to good use.',
      icon: DocumentReportIcon,
    },
    {
      name: 'Proof of address ownership',
      description:
        'We need to verify that the organization owns the ethereum address. A simple tweet will do!',
      icon: ChatAltIcon,
    },
    {
      name: 'Photos',
      description: 'Show your organization in action with photos!',
      icon: PhotographIcon,
    },
    {
      name: 'Links to Social Media',
      description:
        'Share your Facebook, Twitter and other social media accounts so users can follow you.',
      icon: HeartIcon,
    },
  ];
  return (
    visible && (
      <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
        <div className="sm:text-center lg:text-left">
          <h3 className="mt-2 text-3xl leading-8 font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Beneficiary Application
          </h3>
          <p className="mt-2 text-lg text-gray-500">
            The following application is for educational, environmental and open
            source projects seeking funding.
            <InfoIconWithModal
              title="About Funding"
              content="Grants are periodically awarded to organizations which have been voted on by token holders. It is necessary to fill out an application to be considered for grants."
            />
          </p>

          {/* Gradient Feature Section */}
          <p className="mt-2 max-w-3xl text-lg text-gray-500">
            You'll need the following items to submit an application:
          </p>
          <div className="mt-12 grid grid-cols-1 gap-x-6 gap-y-12 sm:grid-cols-2 lg:mt-16 lg:grid-cols-4 lg:gap-x-8 lg:gap-y-16">
            {requirements.map((feature) => (
              <div key={feature.description}>
                <div>
                  <span className="flex items-center justify-center h-12 w-12 rounded-md bg-gray-400 bg-opacity-10">
                    <feature.icon className="h-6 w-6" aria-hidden="true" />
                  </span>
                </div>
                <div className="mt-6">
                  <h3 className="text-lg font-medium">{feature.name}</h3>
                  <p className="mt-2 text-base text-gray-400">
                    {feature.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-24">
            <div className="lg:mx-auto lg:max-w-7xl lg:px-8 lg:grid lg:grid-cols-2 lg:grid-flow-col-dense lg:gap-24">
              <div className="px-4 max-w-xl mx-auto sm:px-6 lg:py-32 lg:max-w-none lg:mx-0 lg:px-0 lg:col-start-2">
                <div>
                  <div>
                    <span className="h-12 w-12 rounded-md flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600">
                      <SparklesIcon
                        className="h-6 w-6 text-white"
                        aria-hidden="true"
                      />
                    </span>
                  </div>
                  <div className="mt-6">
                    <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">
                      Grants are right this way
                    </h2>
                    <p className="mt-4 text-lg text-gray-500">
                      After the application has been submitted, it will be
                      subject to a round of voting. If it receives more "Yes"
                      votes than "No" votes, the organization will be eligible
                      to receive grants.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-12 sm:mt-16 lg:mt-0 lg:col-start-1">
                <div className="pr-4 -ml-48 sm:pr-6 md:-ml-16 lg:px-0 lg:m-0 lg:relative lg:h-full">
                  <img
                    className="w-full rounded-xl lg:absolute lg:right-0 lg:h-full lg:w-auto lg:max-w-none"
                    src="https://gateway.pinata.cloud/ipfs/QmTYgQx6tdwmBiQM8JQ9VUomcKk9SREfyqf2Y1dEtnqRK9"
                    alt="popcorn the cat and friends swimming in popcorn"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white">
            <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 sm:py-24 lg:max-w-7xl lg:px-8 lg:flex lg:items-center lg:justify-between">
              <h2 className="text-4xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
                <span className="block">Ready to get started?</span>
                <span className="block bg-gradient-to-r from-purple-600 to-indigo-600 bg-clip-text text-transparent">
                  Start filling out the form now.
                </span>
              </h2>
              <div className="mt-6 space-y-4 sm:space-y-0 sm:flex sm:space-x-5">
                {/* Check for partially completed form */}
                {formData.organizationName !== '' && (
                  <a
                    href="#"
                    onClick={() => {
                      setCurrentStep(currentStep + 1);
                    }}
                    className="flex items-center justify-center bg-gradient-to-r from-purple-600 to-indigo-600 bg-origin-border px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-white hover:from-purple-700 hover:to-indigo-700"
                  >
                    Continue existing application
                  </a>
                )}

                <a
                  href="#"
                  onClick={() => {
                    setCurrentStep(1);
                    setStepLimit(1);
                    setFormData(defaultFormData);
                  }}
                  className="flex items-center justify-center px-4 py-3 border border-transparent text-base font-medium rounded-md shadow-sm text-indigo-800 bg-indigo-50 hover:bg-indigo-100"
                >
                  Begin new application
                </a>
              </div>
            </div>
          </div>
        </div>
      </main>
    )
  );
}
