import React from 'react';

// TODO: Figure out the types here
export interface CardBodyProps {
    imgUrl: any,
    name: any,
    missionStatement: any,
}

const CardBody: React.FC<CardBodyProps> = ({
  imgUrl,
  name,
  missionStatement,
}) => {
    return(
        <React.Fragment>
            <div className="flex-shrink-0">
                <img className="h-48 w-full object-cover" src={imgUrl} alt=""/>
            </div>
            <div className="flex-1 bg-white p-6 flex flex-col justify-between">
                <div className="flex-1">
                    <p className="text-xl font-semibold text-gray-900">{name}</p>
                    <p className="mt-3 text-base text-gray-500">{missionStatement}</p>
                </div>
            </div>
        </React.Fragment>
    );
};
export default CardBody
