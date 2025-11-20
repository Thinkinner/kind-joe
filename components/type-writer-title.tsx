import Typewriter from 'typewriter-effect';
import React, { useState } from 'react';

function App() {
  const [currentStrings, setCurrentStrings] = useState([
    'Hello World!',
    'This is the first message.',
  ]);

  const changeContent = () => {
    setCurrentStrings([
      'New content here!',
      'Another line of text.',
      'React is awesome!',
    ]);
  };

  return (
    <div>
      <Typewriter
        options={{
          strings: currentStrings,
          autoStart: true,
          loop: true,
        }}
      />
      <button onClick={changeContent}>Change Typewriter Content</button>
    </div>
  );
}

export default App;