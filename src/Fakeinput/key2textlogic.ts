export function keyToText(key: string): string {
    const regex = /^.$/
    if(regex.test(key)){
        return key;
    }
    else if(keyToTextMap[key]){
        return keyToTextMap[key]
    }
    else{
        return `[${key}]`
    }
  
}
type KeyToTextMap = {
  [key: string]: string
}

const keyToTextMap: KeyToTextMap = {
  'Backspace': '',
    'Enter': '\n',
    'Tab': '\t',
    'Shift': '\u21e7',
    'Control': '\u2303',
    'Alt': '\u2325',
    'Escape': '\u238b',
    'ArrowUp': '\u2191',
    'ArrowDown': '\u2193',
    'ArrowLeft': '\u2190',
    'ArrowRight': '\u2192',
    'Space': '\u00A0',
    
  
  // ... 他のキーとテキストのマッピング
}
