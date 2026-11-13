export function isMobileDevice() {
  const { userAgent, maxTouchPoints } = navigator;
  const { userAgentData } = navigator as Navigator & { userAgentData?: { mobile?: boolean } };
  return userAgentData?.mobile === true || /Android|iPhone|iPad|iPod/i.test(userAgent)
    // iPadOS can report a desktop Safari user agent.
    || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
}
