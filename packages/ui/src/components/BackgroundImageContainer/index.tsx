import styled from 'styled-components';
import React from 'react';

export interface BackgroundImageContainerProps {
  imgSrc: string;
}

export const BackgroundImageContainer = styled.div<{ imgSrc: string }>`
  display: block;
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: -1;
  background-size: cover;
  background-repeat: no-repeat;
  background-position: center center;
  background: rgb(131,58,180);
  background: linear-gradient(90deg, rgba(131,58,180,1) 0%, rgba(253,29,29,1) 50%, rgba(252,176,69,1) 100%);
  opacity: 1;

`;
//  background-color: #000;
// background-image: url(${(props) => props.imgSrc});

export interface WithBackgroundImageProps {
  children: React.FC,
  src: string
}

export const withBackgroundImage: React.FC<WithBackgroundImageProps> = (children, src: string) => {
  if (src) {
    return (
      <BackgroundImageContainer imgSrc={src}>
        {children}
      </BackgroundImageContainer>
    );
  }
  return <>{children}</>;
};

export default BackgroundImageContainer;
