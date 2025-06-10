export const onlyContains = (value: string, ...allowedChars: string[]): boolean => {
  for (const char of value) {
    if (allowedChars.indexOf(char) === -1)
      return false;
  }

  return true;
}

export const onlyContainsHex = (value: string) => onlyContains(value, ...('abcdef1234567890'));

const alpha = 'abcdefghijklmnopqrstuvwxyz';
const numeric = '1234567890';
const allowedChars = `${alpha}${alpha.toUpperCase()}${numeric}`;

export const getRandomString = (size: number) => {
  const arr = [];

  for (let i = 0; i < size; i++) {
    arr.push(allowedChars.charAt(Math.floor(Math.random() * allowedChars.length)));
  }

  return arr.join('');
}
