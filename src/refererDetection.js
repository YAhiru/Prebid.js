import { logWarn } from './utils';

export function detectReferer(win) {
  function getLevels() {
    let levels = walkUpWindows();
    let ancestors = getAncestorOrigins();

    if (ancestors) {
      for (let i = 0, l = ancestors.length; i < l; i++) {
        levels[i].ancestor = ancestors[i];
      }
    }
    return levels;
  }

  function getAncestorOrigins() {
    try {
      if (!win.location.ancestorOrigins) {
        return;
      }
      return win.location.ancestorOrigins;
    } catch (e) {
      // Ignore error
    }
  }

  function getPubUrlStack(levels) {
    let stack = [];
    let defUrl = null;
    let encodedUrl = null;
    let frameLocation = null;
    let prevFrame = null;
    let prevRef = null;
    let ancestor = null;
    let detectedRefererUrl = null;

    let i;
    for (i = levels.length - 1; i >= 0; i--) {
      try {
        frameLocation = levels[i].location;
      } catch (e) {
        // Ignore error
      }

      if (frameLocation) {
        encodedUrl = encodeURIComponent(frameLocation);
        stack.push(encodedUrl);
        if (!detectedRefererUrl) {
          detectedRefererUrl = encodedUrl;
        }
      } else if (i !== 0) {
        prevFrame = levels[i - 1];
        try {
          prevRef = prevFrame.referrer;
          ancestor = prevFrame.ancestor;
        } catch (e) {
          // Ignore error
        }

        if (prevRef) {
          encodedUrl = encodeURIComponent(prevRef);
          stack.push(encodedUrl);
          if (!detectedRefererUrl) {
            detectedRefererUrl = encodedUrl;
          }
        } else if (ancestor) {
          encodedUrl = encodeURIComponent(ancestor);
          stack.push(encodedUrl);
          if (!detectedRefererUrl) {
            detectedRefererUrl = encodedUrl;
          }
        } else {
          stack.push(defUrl);
        }
      } else {
        stack.push(defUrl);
      }
    }
    return {
      stack,
      detectedRefererUrl
    };
  }

  function walkUpWindows() {
    let acc = [];
    let currentWindow;
    do {
      try {
        currentWindow = currentWindow ? currentWindow.parent : win;
        try {
          acc.push({
            referrer: currentWindow.document.referrer || null,
            location: currentWindow.location.href || null,
            isTop: (currentWindow == win.top)
          });
        } catch (e) {
          acc.push({
            referrer: null,
            location: null,
            isTop: (currentWindow == win.top)
          });
          logWarn('Trying to access cross domain iframe. Continuing without referrer and location');
        }
      } catch (e) {
        acc.push({
          referrer: null,
          location: null,
          isTop: false
        });
        return acc;
      }
    } while (currentWindow != win.top);
    return acc;
  }

  function refererInfo() {
    try {
      let levels = getLevels();
      let numIframes = levels.length - 1;
      let reachedTop = (levels[numIframes].location !== null ||
        (numIframes > 0 && levels[numIframes - 1].referrer !== null));
      let stackInfo = getPubUrlStack(levels);

      return {
        referer: stackInfo.detectedRefererUrl,
        reachedTop,
        numIframes,
        stack: stackInfo.stack,
      };
    } catch (e) {
      // Ignore error
    }
  }

  return refererInfo;
}

export const getRefererInfo = detectReferer(window);