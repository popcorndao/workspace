import Slider from 'rc-slider';
import 'rc-slider/assets/index.css';
import { useState } from 'react';

export enum Gas {
  Normal,
  Fast,
}

export interface GasSliderProps {
  setGas: any
}

const GasSlider: React.FC<GasSliderProps> = ({ setGas }) => {
  const [value, setValue] = useState(1);

  const sliderSteps = [
    [Gas.Normal, 'Normal'],
    [Gas.Fast, 'Fast'],
  ];
  const sliderMarks = {};
  sliderSteps.forEach(function (step) {
    sliderMarks[step[0]] = {
      style: { color: 'rgba(67, 56, 202)' },
      label: step[1],
    };
  });

  function handleSliderChange(value: number) {
    setValue(value);
    setGas(value);
    console.log('gas selected', value);
  }

  return (
    <>
      <p className="text-xs pt-4">Transaction Speed</p>
      <div className="w-full ml-1 pb-3">
        <Slider
          className="mt-2"
          value={value}
          onChange={(value) => handleSliderChange(value)}
          min={0}
          max={1}
          step={1}
          marks={sliderMarks}
          handleStyle={{ borderColor: 'rgba(67, 56, 202)' }}
          dotStyle={{
            backgroundColor: 'rgba(67, 56, 202)',
            border: 'rgba(67, 56, 202)',
          }}
          activeDotStyle={{
            backgroundColor: 'rgba(67, 56, 202)',
            border: 'rgba(67, 56, 202)',
          }}
          railStyle={{ backgroundColor: 'rgba(67, 56, 202)', height: '4px' }}
          trackStyle={{ backgroundColor: 'rgba(67, 56, 202)', height: '4px' }}
          /* handleStyle={{
              border: '#F29F05',
              backgroundColor: '#fff',
              height: '14px',
              width: '14px',
            }} */
        />
      </div>
    </>
  );
};
export default GasSlider
