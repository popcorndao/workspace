import { DummyBeneficiaryProposal, Stage } from '../interfaces/beneficiaries';

const randomIndex = () => Math.floor(Math.random() * 3);
const getRandomStage = () =>
  ['Open', 'Challenge', 'Completed'][randomIndex()] as Stage;

const getDateSometimeInTheNext48Hours = () => {
  const now = new Date();
  const extraMilliseconds = Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 2);
  return new Date(Date.parse(now.toString()) + extraMilliseconds);
};

export const beneficiaryProposalFixtures: DummyBeneficiaryProposal[] =
  new Array(20).fill(undefined).map(() => {
    return {
      name: 'Room to Read',
      missionStatement:
        'Room to Read seeks to transform the lives of millions of children in low-income communities by focusing on literacy and gender equality in education.',
      profileImage:
        'data:image/jpeg;base64,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',
      twitterUrl: '#',
      linkedinUrl: '#',
      facebookUrl: '#',
      instagramUrl: '#',
      githubUrl: '#',
      dribbleUrl: '#',
      ethereumAddress: '0x70997970C51812dc3A010C7d01b50e0d17dc79C8',
      headerImage:
        'https://pbs.twimg.com/profile_banners/64823914/1591143684/600x200',
      additionalImages: [
        'https://i.ytimg.com/vi/VO1q22eWOcs/maxresdefault.jpg',
        'https://www.livemint.com/rf/Image-621x414/LiveMint/Period2/2017/10/06/Photos/Processed/sfvaseb-kapG--621x414@LiveMint.jpg',
        'https://cdn.asiatatler.com/asiatatler/i/hk/2018/12/20112857-john-wood-reading-with-students-in-nepal_cover_2000x1333.jpg',
        'https://www.roomtoread.org/media/y15dlrxn/gep_anna_tanzania-logo.png?center=0.50013280362582158,0.5&mode=crop&width=1200&height=630&rnd=132630538660400000',
        'https://www.roomtoread.org/media/ydeb4qax/india_jridding.png?anchor=center&mode=crop&width=730&height=460&rnd=132267399952470000',
      ],
      votesAgainst: Math.floor(Math.random() * 1000),
      votesFor: Math.floor(Math.random() * 1000),
      currentStage: 'Challenge',
      stageDeadline: getDateSometimeInTheNext48Hours(),
      impactReports: [
        'https://www.roomtoread.org/media/ch0ihvnu/gmr-2015-final_low-resolution.pdf',
        'https://www.roomtoread.org/media/lutd2ebl/room-to-read-annual-report-2016.pdf',
        'https://www.roomtoread.org/media/o1ve2ukh/room-to-read-annual-report-2017.pdf',
        'https://www.roomtoread.org/media/bf5fayek/rtr_annualreport_2018.pdf',
        'https://www.roomtoread.org/media/nj4gww45/room-to-read-2019-annual-report-1.pdf',
      ],
      proofOfOwnership: 'twitter.com/roomtoread/status/108',
    };
  });

export const beneficiaryProposalFixture: DummyBeneficiaryProposal =
  beneficiaryProposalFixtures[0];