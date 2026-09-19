/**
 * Evaluates whether a restaurant/branch is currently OPEN or CLOSED
 * based on its configured opening/operating hours schedule.
 * @param {Array} schedule Array of day schedule objects ({ day, isOpen, slots })
 * @param {Date} [referenceDate=new Date()] Optional reference date
 */
export const evaluateOperatingStatus = (schedule, referenceDate = new Date()) => {
  if (!schedule || !Array.isArray(schedule) || schedule.length === 0) {
    return {
      isOpen: true,
      isClosed: false,
      currentDay: null,
      statusMessage: 'Open Today',
      formattedHours: 'Open Today',
    };
  }

  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayName = daysOfWeek[referenceDate.getDay()];

  const daySchedule = schedule.find(
    (d) => d && d.day && d.day.toLowerCase() === currentDayName
  );

  if (!daySchedule || !daySchedule.isOpen) {
    return {
      isOpen: false,
      isClosed: true,
      currentDay: currentDayName,
      statusMessage: 'Restaurant is Closed Today',
      formattedHours: 'Closed Today',
    };
  }

  const currentMins = referenceDate.getHours() * 60 + referenceDate.getMinutes();

  const formatTime12h = (timeStr) => {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const displayH = h % 12 === 0 ? 12 : h % 12;
    const displayM = m < 10 ? `0${m}` : m;
    return `${displayH}:${displayM} ${period}`;
  };

  const slots = daySchedule.slots || [];
  if (slots.length === 0) {
    return {
      isOpen: true,
      isClosed: false,
      currentDay: currentDayName,
      statusMessage: 'Open Today',
      formattedHours: 'Open Today',
    };
  }

  const formattedHours = slots
    .map((s) => `${formatTime12h(s.open)} - ${formatTime12h(s.close)}`)
    .join(', ');

  const isCurrentlyWithinSlot = slots.some((s) => {
    if (!s.open || !s.close) return true;
    const [openH, openM] = s.open.split(':').map(Number);
    const [closeH, closeM] = s.close.split(':').map(Number);
    const openMins = openH * 60 + openM;
    const closeMins = closeH * 60 + closeM;

    if (openMins <= closeMins) {
      return currentMins >= openMins && currentMins <= closeMins;
    } else {
      return currentMins >= openMins || currentMins <= closeMins;
    }
  });

  if (isCurrentlyWithinSlot) {
    return {
      isOpen: true,
      isClosed: false,
      currentDay: currentDayName,
      statusMessage: `Open Today (${formattedHours})`,
      formattedHours,
    };
  }

  return {
    isOpen: false,
    isClosed: true,
    currentDay: currentDayName,
    statusMessage: `Restaurant is Currently Closed (Today's Hours: ${formattedHours})`,
    formattedHours,
  };
};
