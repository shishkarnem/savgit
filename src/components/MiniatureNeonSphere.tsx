import React from 'react';
import { NeuronSphereCanvas } from './NeuronSphereCanvas';

interface MiniatureNeonSphereProps {
  isRecording?: boolean;
  size?: number;
  color?: string;
}

export const MiniatureNeonSphere: React.FC<MiniatureNeonSphereProps> = ({
  isRecording = false,
  size = 40,
  color = '#E7C768',
}) => {
  return (
    <div className="relative flex items-center justify-center pointer-events-none" style={{ width: size, height: size }}>
      <NeuronSphereCanvas
        isRecording={isRecording}
        size={size}
        pointCount={45}
        color={color}
        lineColor="rgba(231, 199, 104, 0.3)"
      />
    </div>
  );
};

export default MiniatureNeonSphere;
