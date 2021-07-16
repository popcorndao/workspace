import { BeneficiaryApplication } from '@popcorn/utils';
import * as Icon from 'react-feather';

const SocialMediaIcon = ({
  url,
  platform,
}: {
  url: string;
  platform: string;
}): JSX.Element => {
  return url === '' ? (
    <></>
  ) : (
    <a
      href={`https://${url}`}
      target="_blank"
      className="text-gray-400 hover:text-gray-500"
    >
      {platform === 'twitter' ? (
        <Icon.Twitter aria-hidden="true" />
      ) : platform === 'facebook' ? (
        <Icon.Facebook aria-hidden="true" />
      ) : platform === 'instagram' ? (
        <Icon.Instagram aria-hidden="true" />
      ) : platform === 'github' ? (
        <Icon.GitHub aria-hidden="true" />
      ) : platform === 'linkedin' ? (
        <Icon.Linkedin aria-hidden="true" />
      ) : (
        <></>
      )}
    </a>
  );
};

export default function SocialMedia(
  beneficiary: BeneficiaryApplication,
): JSX.Element {
  return (
    <>
      <div className="flex space-x-6">
        <SocialMediaIcon
          url={beneficiary?.links?.twitterUrl}
          platform={'twitter'}
        />
        <SocialMediaIcon
          url={beneficiary?.links?.facebookUrl}
          platform={'facebook'}
        />
        <SocialMediaIcon
          url={beneficiary?.links?.instagramUrl}
          platform={'instagram'}
        />
        <SocialMediaIcon
          url={beneficiary?.links?.githubUrl}
          platform={'github'}
        />
        <SocialMediaIcon
          url={beneficiary?.links?.linkedinUrl}
          platform={'linkedin'}
        />
      </div>
    </>
  );
}
