import Link from 'next/link';

const IndexPage = () => {
  return (
    <div
      className="w-full h-screen flex flex-col justify-center font-landing"
      style={{ backgroundColor: '#F8F8FB' }}
    >
      <div className="hidden xl:flex flex-row w-full h-5/6">
        <div className="w-1/2 h-full">
          <div className="flex flex-col justify-between ml-24 md:w-8/12 2xl:mx-auto xl:w-1/2 h-full">
            <Link href="/" passHref>
              <a>
                <img
                  src="/images/popcorn_v1_rainbow_bg.png"
                  alt="Logo"
                  className="rounded-full h-14 w-14"
                ></img>
              </a>
            </Link>
            <div className="text-left">
              <p className="uppercase text-2xl font-medium text-gray-400">
                Coming Soon
              </p>
              <h1 className="uppercase font-bold text-8xl text-gray-900">
                Popcorn
              </h1>
              <p className="text-3xl text-gray-900">DeFi for the People</p>
              <form
                action="https://network.us1.list-manage.com/subscribe/post?u=5ce5e82d673fd2cfaf12849a5&amp;id=e85a091ed3"
                method="post"
                id="mc-embedded-subscribe-form"
                name="mc-embedded-subscribe-form"
                className="validate"
                target="_blank"
                noValidate
              >
                <div
                  id="mc_embed_signup_scroll"
                  className="shadow-lg bg-white rounded-full py-2 px-2 mt-8 w-full border border-gray-400 flex flex-row items-center justify-between"
                >
                  <input
                    type="email"
                    name="EMAIL"
                    className="email w-10/12 p-2 text-base mx-4"
                    id="mce-EMAIL"
                    placeholder="Email Address"
                    required
                  />
                  <div
                    style={{ position: 'absolute', left: '-5000px' }}
                    aria-hidden="true"
                  >
                    <input
                      type="text"
                      name="b_5ce5e82d673fd2cfaf12849a5_e85a091ed3"
                      tabIndex={-1}
                    />
                  </div>
                  <div className="clear">
                    <input
                      type="submit"
                      value="Join Waitlist"
                      name="subscribe"
                      id="mc-embedded-subscribe"
                      className="button pb-2 button-primary bg-ctaYellow hover:bg-ctaYellowLight text-gray-800 hover:text-gray-900 rounded-full h-10 flex flex-col items-center justify-center cursor-pointer"
                      readOnly
                    />
                  </div>
                </div>
              </form>
            </div>
            <Link href="/docs/Popcorn_whitepaper_v1.pdf" passHref>
              <a
                className="text-3xl text-gray-900 font-light border-b-2  border-black w-max"
                target="_window"
              >
                Read the whitepaper
              </a>
            </Link>
          </div>
        </div>
        <div className="w-1/2 h-full flex flex-col justify-center">
          <div
            className="bg-hero-pattern flex-shrink-0 flex-grow-0 rounded-l-full bg-white w-full h-full"
            style={{
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          ></div>
        </div>
      </div>
      <div className="flex xl:hidden flex-col w-full h-full pt-12 md:pt-18">
        <div className="w-full h-1/2 flex flex-row justify-end">
          <div className="flex flex-row w-11/12 h-full">
            <Link href="/" passHref>
              <a>
                <img
                  src="/images/popcorn_v1_rainbow_bg.png"
                  alt="Logo"
                  className="rounded-full h-10 w-10 md:h-14 md:w-14 absolute"
                ></img>
              </a>
            </Link>
            <div
              className="bg-hero-pattern flex-shrink-0 flex-grow-0 rounded-l-full bg-white w-full h-full"
              style={{
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
          </div>
        </div>
        <div className="w-full h-1/2 flex flex-row justify-end">
          <div className="flex flex-col justify-between w-11/12 h-5/6 my-auto">
            <div className="text-left">
              <p className="uppercase text-xl md:text-2xl font-medium text-gray-400">
                Coming Soon
              </p>
              <h1 className="uppercase font-bold text-6xl md:text-8xl text-gray-900">
                Popcorn
              </h1>
              <p className="text-2xl md:text-3xl text-gray-900">
                DeFi for the People
              </p>
              <form
                action="https://network.us1.list-manage.com/subscribe/post?u=5ce5e82d673fd2cfaf12849a5&amp;id=e85a091ed3"
                method="post"
                id="mc-embedded-subscribe-form"
                name="mc-embedded-subscribe-form"
                className="validate"
                target="_blank"
                noValidate
              >
                <div
                  id="mc_embed_signup_scroll"
                  className="shadow-lg bg-white rounded-full py-2 px-2 mt-8 w-10/12 border border-gray-400 flex flex-row items-center justify-between"
                >
                  <input
                    type="email"
                    name="EMAIL"
                    className="email w-10/12 p-2 text-base ml-4 mr-2 md:mx-4"
                    id="mce-EMAIL"
                    placeholder="Email Address"
                    required
                  />
                  <div
                    style={{ position: 'absolute', left: '-5000px' }}
                    aria-hidden="true"
                  >
                    <input
                      type="text"
                      name="b_5ce5e82d673fd2cfaf12849a5_e85a091ed3"
                      tabIndex={-1}
                    />
                  </div>
                  <div className="clear">
                    <input
                      type="submit"
                      value="Join Waitlist"
                      name="subscribe"
                      id="mc-embedded-subscribe"
                      className="button pb-2 button-primary bg-ctaYellow hover:bg-ctaYellowLight text-gray-800 hover:text-gray-900 rounded-full h-10 flex flex-col items-center justify-center cursor-pointer"
                      readOnly
                    />
                  </div>
                </div>
              </form>
            </div>
            <Link href="/docs/Popcorn_whitepaper_v1.pdf" passHref>
              <a
                className="text-xl md:text-3xl text-gray-900 font-light border-b md:border-b-2 border-black w-max"
                target="_window"
              >
                Read the whitepaper
              </a>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IndexPage;
