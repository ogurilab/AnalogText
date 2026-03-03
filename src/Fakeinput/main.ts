import '../style.css'

import { keyToText } from './key2textlogic'
let isIMEActive = false; // IMEがアクティブかどうかのフラグ
let isInComposition = false; // 現在文字変換中かどうかのフラグ
export function IsinComposition(){
  return isInComposition;
}
export function IsIMEActive(){
  return isIMEActive;
}





document.querySelector<HTMLDivElement>('#CustomIME')!.innerHTML = `
  <input type='checkbox' id='IMEActiveCheckbox'><label for='IMEActiveCheckbox'>IME Active</label>
  
  <div id="inputArea"  tabindex="0" style="margin:0px; height:100px; background-color: #aaaaaa;">
    
  </div>
  
`
let CheckLock=false;
document.getElementById('IMEActiveCheckbox')!.addEventListener('change', () => {
  if(CheckLock){
    return;
  }
  CheckLock=true;
  toggleIME();
  setTimeout(() => {
    CheckLock=false;
  }, 100);
  
});
function toggleIME(){
  if (isIMEActive&&isInComposition) {
      // IMEが非アクティブになったとき、変換中の文字があれば確定させる
      
      onKeyEvent('Enter', `velocity:${0},depth:${0}`);
   }
  isIMEActive=!isIMEActive;
  console.log(`IME Active set to: ${isIMEActive}`);
  (document.getElementById('IMEActiveCheckbox') as HTMLInputElement).checked=isIMEActive;

}

let isUpperCase = false;
document.addEventListener('keydown', (event) => {
  if (event.key === 'Shift') {
    isUpperCase = true;
  }
});

document.addEventListener('keyup', (event) => {
  if (event.key === 'Shift') {
    isUpperCase = false;
  }
});

const inputArea = document.getElementById('inputArea') as HTMLDivElement;
const cursor ='|';
const cursorElement = document.createElement('span');
cursorElement.textContent = cursor;
cursorElement.style.animation = 'blinking 0.5s ease-in-out infinite alternate';
cursorElement.id = 'cursorElement';
const endElement = document.createElement('span') as HTMLSpanElement;
endElement.id = 'endElement';
endElement.textContent = '\u00A0'; // スペースを表示するための特殊文字
inputArea.appendChild(cursorElement);
inputArea.appendChild(endElement);
endElement.addEventListener('click', () => {
  const inputArea = document.getElementById('inputArea') as HTMLDivElement;
  inputArea.removeChild(inputArea.querySelector('#cursorElement')!);
  inputArea.insertBefore(cursorElement, endElement);
});



/*inputArea.addEventListener('keydown', (event) => {
  onKeyEvent(event.key);
});*/

export function onKeyEvent(key: string,tag?:string) {
  console.log(`Key event: ${key}, tag: ${tag}`);
 if (key === 'Backspace') 
  {
    const previousSibling = cursorElement.previousSibling;
    if (previousSibling && previousSibling.nodeType === Node.ELEMENT_NODE) {
      previousSibling.remove();
    }
    return;
  }else if (key === 'Enter') {
    if(isIMEActive&&isInComposition){
        endComposition();
    }
    else{
      const textElement = document.createElement('br');
      textElement.textContent = '\u00A0'; // スペースを表示するための特殊文字
      textElement.id = 'textElement';
      textElement.addEventListener('click', () => {
        inputArea.removeChild(inputArea.querySelector('#cursorElement')!);
        inputArea.insertBefore(cursorElement, textElement);
      });
      cursorElement.before(textElement);
    }
    
    
    return;
  }else if (key === 'Shift') {
    return;
  }
  else 
  {
    if(isIMEActive){
        isInComposition=true;
    }
      

  }
  
  const text = isUpperCase ? keyToText(key).toUpperCase() : keyToText(key).toLowerCase();
  const textElement= document.createElement('span');
  textElement.textContent = text;
  textElement.dataset.tag = tag || '';
  textElement.id = 'textElement';
  textElement.dataset.composition = (isInComposition&&isIMEActive) ? 'true' : 'false';
  if(isInComposition&&isIMEActive){
    textElement.style.background = 'lightblue';
  }
  textElement.addEventListener('click', () => {
    inputArea.removeChild(inputArea.querySelector('#cursorElement')!);
    endComposition();
    inputArea.insertBefore(cursorElement, textElement);
  });
  
  cursorElement.before(textElement);
}
export function ToggleIME(){
  toggleIME();
}
 export function endComposition(){
  if(isIMEActive){
    isInComposition=false;
    const textelement = document.querySelectorAll('#textElement') as NodeListOf<HTMLSpanElement>;
    textelement.forEach((element)=>{
        if(element.dataset.composition && element.dataset.composition==='true'){
          element.dataset.composition='false';
          element.style.background='';

        }
    });

  }
}




