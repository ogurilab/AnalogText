import type { Device, KeyInput } from '../public/analogsense';
import { onKeyEvent } from './Fakeinput/main';

import './style.css'

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
let isVelocity=true;  // 速度モードかどうかのフラグ



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
    

    <div>
      <label for="isVelocity">Velocity Mode</label>
      <input type="checkbox" id="isVelocity" checked><br>
      <label for="heatmap">Heatmap Output Multiplier: ${outputMulti}</label>
      <input type="range" id="heatmap" min="1" max="1000" step="0.01" value="${outputMulti}">
    </div>
  </div>
`
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
      
    // 押し込み具合が閾値以下かつ前回の押し込み具合が閾値以上の場合、キーが離されたと判断
    const values=mapData[key];
    const len=values.length;
    if(len>=2){
      const prevValue=values[len-2].x;
      if(input.value < threshold && prevValue >= threshold){
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
        

        onKeyEvent(key,`velocity:${avragevelocity},depth:${maxDepth}` );
        // 押し込みデータをリセット
        mapData[key] = [];
        // 結果データをhtmlに出力
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
document.getElementById('isVelocity')!.addEventListener('change', (event)=>{
      const target = event.target as HTMLInputElement;
      isVelocity = target.checked;
      console.log(`isVelocity set to: ${isVelocity}`);
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
      const valueForHue=isVelocity ? hue : Math.min(240, Math.floor(maxDepth  * 240));
      element.style.color = `hsl(${240-valueForHue}, 100%, 50%)`;
      // 押し込みデータに基づいて色を決定し、表示用のHTMLを生成
      
    }
  });
  

  
  
}


