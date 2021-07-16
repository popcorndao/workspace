import { BeneficiaryApplication } from '@popcorn/utils';

export interface VideoSideBarProps {
    beneficiary: BeneficiaryApplication,
}

const VideoSideBar: React.FC<VideoSideBarProps> = (
    {beneficiary},
) => {
    return(
        <div>
            <h3 className="text-lg leading-6 font-medium text-gray-900">Video</h3>
            <video className="justify-self-center" controls>
                <source
                    src={'https://gateway.pinata.cloud/ipfs/' + beneficiary?.files?.video}
                    type="video/mp4"
                />
                Sorry, your browser doesn't support embedded videos.
            </video>
        </div>
    );
};
export default VideoSideBar
