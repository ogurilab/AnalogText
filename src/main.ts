import type { Device, KeyInput } from './analogsense';

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

// ログ用の変数
let logArea="";

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
    <div id="outputArea">
      
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
    await window.analogsense.requestDevice().then((device: Device | undefined) => {
      if (device) {
        console.log(`Connected to device: ${device.getProductName()}`);
        device.startListening(handleInputs);
      } else {
        console.log('No device selected.');
      }
    
  });
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
  let outputArea=document.getElementById('outputArea');
  if(!outputArea){
    outputArea=document.createElement('div');
    outputArea.id='outputArea';
    document.body.appendChild(outputArea);
  }
  logArea="";
  resultData.forEach((data)=>{
    
    //キーをが底を打った時間を除外して、押し込みはじめから底を打つまでの平均速度を計算
    let avragevelocity=0;
    //キーが一番深く押されたときの値とインデックスを保存
    let maxdepth=0;
    let maxindex=0;
    data.values.forEach((value, index)=>{
      if(value.x>maxdepth){
        maxdepth=value.x;
        maxindex=index;
      }
    });
    //底を打つまでの時間を計算
    const timeToBottom=data.values[maxindex].y - data.values[0].y;
    //平均速度を計算（timeToBottom が 0 以下の場合は 0 とする）
    if (timeToBottom > 0) {
      avragevelocity = maxdepth / timeToBottom;
    } else {
      avragevelocity = 0;
    }
    //0~240の範囲に変換
    const hue=Math.min(240, Math.floor(avragevelocity * outputMulti * 240));
    const maxDepthValue=data.values[maxindex].x;
    // velocityモードの場合は平均速度、depthモードの場合は最大押し込み具合で色を決定
    const valueForHue=isVelocity ? hue : Math.min(240, Math.floor(maxDepthValue  * 240));

    // 押し込みデータに基づいて色を決定し、表示用のHTMLを生成
    logArea+=`<div style="background-color: hsl(${240 - valueForHue},100%,50%); display:inline;">${data.key}</div>`;
    
  });

  // 生成した HTML を DOM に反映する（これが抜けているのが表示されない原因）
  outputArea.innerHTML = logArea;
}


