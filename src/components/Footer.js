import React from 'react';

const dateTime = new Date().toLocaleString();
const hours = new Date().getHours();
// new Date().toLocaleDateString(); - JS to get Date only if needed later
// new Date().toLocaleTimeString(); - JS to get Time only if needed later

let timeOfDay;
const dayStyles = {};
if (hours < 12) {
  timeOfDay = 'morning';
  dayStyles.color = '#00cc00';
} else if (hours >= 12 && hours <= 17) {
  timeOfDay = 'afternoon';
  dayStyles.color = '#ffff00';
} else {
  timeOfDay = 'night';
  dayStyles.color = '#6666ff';
}

export default function Footer() {
  return (
    <div className="footer">
      <p>(C) 2020 Nexus Novem &nbsp; </p>
      <p style={dayStyles}> &nbsp; Good {timeOfDay}! &nbsp; </p>
      <p> &nbsp; This page was last loaded at: {dateTime}</p>
    </div>
  );
}
