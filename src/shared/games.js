// Each game's own gamepad controls, shown in the "controls" window as a reference
// while deciding where to put things on the stick. Grouped into titled sections.

export const GAMES = Object.freeze([
  {
    id: 'ace-combat-8',
    name: 'Ace Combat 8',
    short: 'AC8',
    source: 'In-game default gamepad controls',
    sections: [
      {
        title: 'Flight & weapons',
        controls: [
          { action: 'Yaw left', target: 'lb' },
          { action: 'Yaw right', target: 'rb' },
          { action: 'Accelerate', target: 'rt' },
          { action: 'Decelerate', target: 'lt' },
          { action: 'Fire machine gun', target: 'a' },
          { action: 'Fire missile or weapon', target: 'b' },
          { action: 'Change weapon / Next weapon', target: 'x' },
          { action: 'Change target', target: 'y' },
          { action: 'Switch radar map', target: 'view' },
          { action: 'Deploy flares', target: 'ls_rs_click' },
        ],
      },
      {
        title: 'Camera',
        controls: [
          { action: 'Camera up', target: 'rs_up' },
          { action: 'Camera left', target: 'rs_left' },
          { action: 'Camera down', target: 'rs_down' },
          { action: 'Camera right', target: 'rs_right' },
        ],
      },
      {
        title: 'Squad commands',
        controls: [
          { action: 'Forward attack', target: 'dpad_up' },
          { action: 'Disp. atk.', target: 'dpad_left' },
          { action: 'SP weapons on/off', target: 'dpad_right' },
          { action: 'Cover', target: 'dpad_down' },
        ],
      },
    ],
  },
  {
    id: 'galactic-racer',
    name: 'Star Wars Galactic Racer',
    short: 'SWGR',
    source: 'Default gamepad controls & JaffaQuake Pod-Style bridge',
    sections: [
      {
        title: 'Podracer Driving & Thrusters',
        controls: [
          { action: 'Thrust / Accelerate', target: 'rt' },
          { action: 'Brake / Reverse', target: 'lt' },
          { action: 'Steering', target: 'ls_x' },
          { action: 'Pitch', target: 'ls_y' },
        ],
      },
      {
        title: 'Actions & Repairs',
        controls: [
          { action: 'Boost / Primary Action', target: 'a' },
          { action: 'Airbrake / Repair', target: 'b' },
          { action: 'Look Back / Secondary', target: 'x' },
          { action: 'Change View / Camera', target: 'y' },
          { action: 'View / Stats', target: 'view' },
          { action: 'Menu / Pause', target: 'menu' },
        ],
      },
      {
        title: 'Directional / D-Pad',
        controls: [
          { action: 'Repair Engine Up', target: 'dpad_up' },
          { action: 'Repair Engine Down', target: 'dpad_down' },
          { action: 'Repair Left Engine', target: 'dpad_left' },
          { action: 'Repair Right Engine', target: 'dpad_right' },
        ],
      },
    ],
  },
]);

