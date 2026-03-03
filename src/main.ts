import type { Device, KeyInput } from '../public/analogsense';
import { onKeyEvent } from './Fakeinput/main';
import { keys } from '../public/analogsense';
import './style.css'
import { ToggleIME } from './Fakeinput/main';
import { IsIMEActive, IsinComposition,endComposition } from './Fakeinput/main';

import romajiConv from '@koozaki/romaji-conv';


// グローバル変数の型定義
declare global {
  interface Window {
    Analogsense: {
      requestDevice(): Promise<any>;
      getDevices(): Promise<any[]>;
      scancodeToString(scancode: number): string;
    };
  }
}


const threshold = 0.1;  // 押し込み具合の閾値
let outputMulti = 4; // ヒートマップ出力の係数




// mapデータ保存用の配列(x=押し込み具合、y=Δt)
type num2={
  x: number;
  y: number;
}
const mapData:Record<string, num2[]> = {};

type keydata = {
  key: string;
  values: num2[];
}
// 時系列で打ち込まれたキーごとの押し込みデータを保存する配列
const resultData:keydata[] = [];
// 計測用タイマー変数。最初の描画からの経過時間をmsで保存

let time=0;
const timer=setInterval(() => {
  time+=1;
}, 1);;
timer;



document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
  <div>
    <div id="header">
      <h1>Analog Text</h1>
    </div>
    <div id= "connect">
      <button id="connectButton">Connect to Analog Text Device</button>
    </div>
    <label for="modeSelect">IME toggle key:</label>
    <select id="modeSelect"></select>

    
    <div id="IME_List">
    </div>
    <div>
      <label for="isVelocity">Velocity Mode</label>
      
      <label for="heatmap">Heatmap Output Multiplier: ${outputMulti}</label>
      <input type="range" id="heatmap" min="1" max="1000" step="0.01" value="${outputMulti}">
    </div>

  </div>
`

const modeOptions = keys.map(key => key.name);
let imeToggleKey = modeOptions.find(key => key === 'Caps Lock') || modeOptions[0]; // デフォルトでCaps Lockを選択
document.querySelector<HTMLSelectElement>('#modeSelect')!.innerHTML = modeOptions.map((key) => `<option value="${key}">${key}</option>`).join('');
document.querySelector<HTMLSelectElement>('#modeSelect')!.value = modeOptions.find(key => key === 'Caps Lock') || modeOptions[0]; // デフォルトでWASDを選択
document.querySelector<HTMLSelectElement>('#modeSelect')!.addEventListener('change', (event) => {
  const target = event.target as HTMLSelectElement;
  const selectedKey = target.value;
  console.log(`Selected key: ${selectedKey}`);
  // ここで選択されたキーに基づいてIMEのトグルキーを設定する処理を追加
  imeToggleKey = selectedKey;


});


// デバイスを認識、HandleInputs関数で入力を処理
document.getElementById('connectButton')!.addEventListener('click', async () => {
  console.log('Requesting device...');
    if(window.analogsense){
      console.log('AnalogSense API is available.');
    }else{
      console.error('AnalogSense API is not available.');
      alert("AnalogSense API is not available in this browser.");
      return;
    }
    if("hid" in window.navigator)
    {
      await window.analogsense.requestDevice().then((device: Device | undefined) => {
      if (device) {
        
        console.log(`Connected to device: ${device.getProductName()}`);
        device.startListening(handleInputs);
      } else {
        console.log('No device selected.');
      }
      }).catch((error: any) => {
        console.error('Error connecting to device:', error);
      });

    }
    else
    {
      alert("WebHID API is not supported in this browser."); 
    }
    
    
});



// 入力を処理する関数
function handleInputs(inputs: KeyInput[]) {
  inputs.forEach((input: { scancode: number; value: number }) => {
    const key = window.analogsense.scancodeToString(input.scancode);
    console.log(`Key: ${key}, Value: ${input.value}`);
    let num2={x:input.value,y: time};
    if(!mapData[key]){
      mapData[key]=[];
    }
    // もし押し込み具合が閾値以上なら、押し込みデータに追加
    if(input.value >= threshold)
    {
      mapData[key].push(num2);
    }
      
    // 押し込み具合が閾値以下かつ前回の押し込み具合が閾値以上の場合、もしくはキーがそこを打った場合キーが離されたと判断
    const values=mapData[key];
    const len=values.length;
    if(len>=3){
      const currentValue=values[len-1].x;
      const prevValue=values[len-2].x;
      const prepreValue=values[len-3] ? values[len-3].x : 0;
      if((prevValue>currentValue&&prepreValue<prevValue)){
        // キーが離されたときの処理
        console.log(`Key ${key} released`);
        // 結果データに追加
        resultData.push({key: key, values: values.slice()});
        let maxDepth=0;
        let maxindex=0;
        let i=0;
        values.forEach((value)=>{
          if(value.x>maxDepth){
            maxDepth=value.x;
            maxindex=i;
            i++;
          }
        });
        console.log(`Max Depth: ${maxDepth}`);
        let avragevelocity=0;
        const timeToBottom=values[maxindex].y - values[0].y;
        if (timeToBottom > 0) {
          avragevelocity = maxDepth / timeToBottom;
        } else {
          avragevelocity = 0;
        }
        console.log(`Avrage Velocity: ${avragevelocity}`);
        
        //キーイベントをFakeInputに送信
        if(key===imeToggleKey){
          ToggleIME();
        }else{
          onKeyEvent(key,`velocity:${avragevelocity},depth:${maxDepth}` );
          ReloadIMEList();
        }
        

        // 押し込みデータをリセット
        mapData[key] = [];
        // 文字の色を更新
        OutputResultData();
      }
    }


  });
};
document.getElementById('heatmap')!.addEventListener('input', (event)=>{
      const target = event.target as HTMLInputElement;
      outputMulti = parseFloat(target.value);
      console.log(`Output Multi set to: ${outputMulti}`);
      OutputResultData();
    });

// 結果データをhtmlに出力する関数
function OutputResultData()
{
  let inputArea=document.getElementById('inputArea');
  if(!inputArea){
    inputArea=document.createElement('div');
    inputArea.id='inputArea';
    document.body.appendChild(inputArea);
  }
  
  inputArea.childNodes.forEach((node)=>{
    if(node.nodeType===Node.ELEMENT_NODE){
      const element=node as HTMLElement;

      const tag=element.dataset.tag;
      if(!tag){
        return;
      }
      const [velocityStr,depthStr]=tag.split(',');
      const avragevelocity=parseFloat(velocityStr.split(':')[1]);
      const maxDepth=parseFloat(depthStr.split(':')[1]);
      //0~240の範囲に変換
      const hue=Math.min(240, Math.floor(avragevelocity * outputMulti * 240));
      
      // velocityモードの場合は平均速度、depthモードの場合は最大押し込み具合で色を決定
      const depth=20;
      const v=Math.min(depth, Math.floor(maxDepth  * depth))+10;
      element.style.color = `hsl(${240-hue}, 100%, 50%)`;
      element.style.fontSize=`${v}px`;
      // 押し込みデータに基づいて色を決定し、表示用のHTMLを生成
      
    }
  });
  
  

  
  
}
function ReloadIMEList(){
    const imeList=document.getElementById('IME_List');
    if(!imeList){
      return;
    }
    imeList.innerHTML='';
    if(IsIMEActive()&& IsinComposition()){
      const inputDiv=document.getElementById('inputArea') as HTMLDivElement;
      // inputArea内のspan要素をすべて取得
      const spans = inputDiv.querySelectorAll('span');
      const compositionText = Array.from(spans).map(span => span.textContent).join('').slice(0, -1)+','; // 最後のカーソルを除外し、変換が区切られない様にする
      const composititonHiragana=romajiConv(compositionText).toHiragana();
      const httpRequest = new XMLHttpRequest();
      httpRequest.open('GET', `https://www.google.com/transliterate?langpair=ja-Hira|ja&text=${encodeURIComponent(composititonHiragana)}`);
      httpRequest.onreadystatechange = () => {
        if (httpRequest.readyState === XMLHttpRequest.DONE) {
          if (httpRequest.status === 200) {
            const response = JSON.parse(httpRequest.responseText);
            const candidates = response[0][1];
            candidates.forEach((candidate: string) => {
              const candidateElement = document.createElement('button');
              candidateElement.textContent = candidate;
              candidateElement.addEventListener('click', () => {
                const inputDiv = document.getElementById('inputArea') as HTMLDivElement;
                const spans = inputDiv.querySelectorAll('span');
                let compositionElement = Array.from(spans).filter(span => (span.dataset.tag&&span.dataset.composition&&span.dataset.composition === 'true'));
                let avgvelocity=0;
                let avgdepth=0;
                if(!compositionElement){
                  endComposition();
                  return;
                }

                compositionElement.forEach(span => {
                  const tag = span.dataset.tag;
                  if(tag){
                    const [velocityStr,depthStr]=tag.split(',');
                    avgvelocity+=parseFloat(velocityStr.split(':')[1]);
                    avgdepth+=parseFloat(depthStr.split(':')[1]);
                  }
                });
                avgvelocity/=compositionElement.length;
                avgdepth/=compositionElement.length;
                if (compositionElement.length > 0) {
                  const lastSpan = compositionElement[compositionElement.length - 1];
                  lastSpan.textContent = candidate;
                  lastSpan.dataset.tag = `velocity:${avgvelocity},depth:${avgdepth}`;
                  lastSpan.dataset.composition = 'false';
                  lastSpan.style.background = '';
                  // data-composition属性がtrueの要素をすべて取得し、削除
                  document.querySelectorAll('span[data-composition="true"]').forEach(span => {
                    span.remove();
                  });
                  // 変換候補が選択されたときの処理をここに追加
                  
                  endComposition();
                  ReloadIMEList();
                  
                }
              });
              imeList.appendChild(candidateElement);
            });
            
          } else {
            console.error('Error fetching transliteration:', httpRequest.status);
          }
        }
      };
      httpRequest.send();
    }

  }


