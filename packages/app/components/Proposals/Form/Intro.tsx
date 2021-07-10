import { defaultFormData, FormStepProps } from 'pages/proposals/propose';

export default function Intro({
  form,
  navigation,
  visible,
}: FormStepProps): JSX.Element {
  const [formData, setFormData] = form;
  const { currentStep, setCurrentStep, stepLimit, setStepLimit } = navigation;

  return (
    visible && (
      <main className="mt-10 mx-auto max-w-7xl px-4 sm:mt-12 sm:px-6 md:mt-16 lg:mt-20 lg:px-8 xl:mt-28">
        <div className="sm:text-center lg:text-left">
          <h1 className="text-4xl mb-8 tracking-tight font-extrabold text-gray-900 sm:text-5xl md:text-6xl">
            <span className="block xl:inline">
              Beneficiary Nomination Proposal
            </span>
          </h1>
          <p className="mt-3 mr-10 text-lg tracking-tight text-gray-500 sm:text-lg md:text-lg">
            For an organization to become an eligible grant recipient, a
            Beneficiary Nomination Proposal (BNP) must be raised and the
            proposal must receive a majority of votes cast towards “Yes” with at
            least 10% of the available supply of governance tokens voting “Yes”.
          </p>
          <p className="mt-3 mr-10 text-lg tracking-tight text-gray-500 sm:text-lg md:text-lg">
            An organization wishing to apply for eligible beneficiary status may
            acquire the requisite number of POP tokens to raise a BNP (2000), or
            they may reach out to the Popcorn Foundation to seek a nomination at
            no cost.
          </p>
          <p className="mt-3 mr-10 text-lg tracking-tight text-gray-500 sm:text-lg md:text-lg">
            Supplementary application materials, such as mission statement,
            proof of address ownership, photos, links to social media accounts,
            and links to impact reports will be included as an IPFS content
            hash.
          </p>
          <div className="mt-5 sm:mt-8 sm:flex sm:justify-center lg:justify-start">
            {/* Check for partially completed form */}
            {formData.organizationName !== '' ? (
              <div className="rounded-md shadow">
                <a
                  onClick={() => {
                    setCurrentStep(currentStep + 1);
                  }}
                  className="w-full flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 md:py-4 md:text-lg md:px-10"
                >
                  Continue
                </a>
              </div>
            ) : (
              <></>
            )}
            <button
              onClick={() => {
                setCurrentStep(1);
                setStepLimit(1);
                setFormData(defaultFormData);
              }}
              type="button"
              className="w-80 flex items-center justify-center px-8 py-3 border border-transparent text-base font-medium rounded-md text-indigo-700 bg-indigo-100 hover:bg-indigo-200 md:py-4 md:text-lg md:px-10 mt-3 sm:mt-0"
            >
              Start new proposal
            </button>
          </div>
        </div>
      </main>
    )
  );
}
