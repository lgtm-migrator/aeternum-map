export const NEW_WORLD_CLASS_ID = 21816;

export function isNewWorldRunning(): Promise<boolean> {
  return new Promise((resolve) => {
    overwolf.games.getRunningGameInfo((result) => {
      resolve(result && result.classId === NEW_WORLD_CLASS_ID);
    });
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getGameInfo(): Promise<any> {
  return new Promise((resolve, reject) => {
    overwolf.games.events.getInfo((info) => {
      if (info.success) {
        resolve(info.res);
      } else {
        reject(info);
      }
    });
  });
}