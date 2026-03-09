import type { Device, KeyInput } from './analogsense';
import { onKeyEvent } from './Fakeinput/main';
import { keys } from './analogsense';
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





document.querySelector<HTMLDivElement>('#app')!.innerHTML = `

  <div>
    <div id="header">
      <h1>Analog Text</h1>
    </div>
    <div id="CrossOrigin">
      ${window.crossOriginIsolated ? 'Cross-Origin Isolated: Yes' : 'Cross-Origin Isolated: No'}
    </div>
    <div id= "connect">
      <button id="connectButton">Connect to Analog Text Device</button>
    </div>
    <label for="modeSelect">IME toggle key:</label>
    <select id="modeSelect"></select>

    
    
    <div>
      
      
      <label for="heatmap">Heatmap Output Multiplier: ${outputMulti}</label>
      <input type="range" id="heatmap" min="1" max="1000" step="0.01" value="${outputMulti}">
    </div>
    <button id="downloadButton">Download Result Data</button>
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
  const time=performance.now();
  inputs.forEach((input: { scancode: number; value: number }) => {
    
    const key = window.analogsense.scancodeToString(input.scancode);
    //console.log(`Key: ${key}, Value: ${input.value},dt:${time-Gprevtime},len:${mapData[key]?.length||0}`);
    
    let num2={x:input.value,y: time};
    if(!mapData[key]){
      mapData[key]=[];
    }
    
    // もし押し込み具合が閾値以上なら、押し込みデータに追加
    if(input.value >= threshold)
    {
      mapData[key].push(num2);
      
    }
    else if(mapData[key].length>0)
    {
      // 押し込み具合が閾値未満で、かつ押し込みデータが存在する場合は、キーが離されたと判断して処理を行う
      mapData[key].push(num2);

      // 結果データに追加
      resultData.push({key: key, values: mapData[key].slice()});
      mapData[key] = [];
    }
    
      
    // 押し込み具合が前回の物から下降している、もしくはキーがそこを打った場合キー打たれたと判断
    const values=mapData[key];
    console.log(`key: ${key}, len: ${values.length}`);
    const len=values.length;
    if(len>=3){
      const currentValue=values[len-1].x;
      const prevValue=values[len-2].x;
      const prevTime=values[len-2].y-values[0].y;
      const prepreValue=values[len-3].x;
      if((prepreValue<=prevValue&&prevValue>currentValue)){
        // キーが離されたときの処理
        console.log(`Key ${key} released`);
        
        const avragevelocity=prevValue/(prevTime==0 ? 0.00001 : prevTime);
        const maxDepth=prevValue;
        console.log(`Velocity: ${avragevelocity}, Depth: ${maxDepth},time:${prevTime}`);
        // if(document.activeElement&&document.activeElement.parentElement?.id==='IME_List'){
        //   (document.activeElement as HTMLButtonElement).click();
        //   // 押し込みデータをリセット
        //   mapData[key] = [];
        //   // 文字の色を更新
        //   OutputResultData();
        //   return;
        // }
        
        //キーイベントをFakeInputに送信
        if(key===imeToggleKey){
          ToggleIME();
        }
        else if(IsIMEActive()&& IsinComposition()&&(key=== 'Enter'|| key==='Space')){
          if(key==='Enter'){
            console.log('Enter has pushed End Composition');
            endComposition();
          }
          if(key==='Space'){
            IMENext();
          }
        }else{
          onKeyEvent(key,`velocity:${avragevelocity},depth:${maxDepth}` );
          setTimeout(() => {
          ReloadIMEList();
        }, 100);
        }
        
        // 文字の色を更新
        OutputResultData();

       
      }
    }



  });
  document.querySelector('#keymap')!.innerHTML='';
  let keymap=document.querySelector('#keymap')!;
  Object.keys(mapData).forEach((key)=>{
    const values=mapData[key];
    const lastValue=values[values.length-1];
    if(!lastValue){
      keymap.innerHTML+=`<div>${key}: No data</div>`;
      return;

    }
    const keyElement=document.createElement('meter')as HTMLMeterElement;
    keyElement.min=0;
    keyElement.max=100;
    keyElement.value=lastValue.x*100;
    
    keymap.appendChild(keyElement);
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
      const compositionElement = Array.from(spans).filter(span => (span.dataset.tag&&span.dataset.composition&&span.dataset.composition === 'true'));
      if(compositionElement.length===0){
        return;
      }
      const compositionText = Array.from(compositionElement).map(span => span.textContent).join('')+','; // 最後のカーソルを除外し、変換が区切られない様にする
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
              candidateElement.type = 'button';
              candidateElement.textContent = candidate;
              // スペースキーでボタンがアクティブ化されるのを防ぐ
              candidateElement.addEventListener('keydown', (e: KeyboardEvent) => {
                if (e.key === ' ' || e.code === 'Space') {
                  e.preventDefault();
                  e.stopPropagation();
                  return false;
                }
              });
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
  function IMENext(){
    const imeList=document.getElementById('IME_List');
    if(!imeList){
      return;
    }
    const buttons=imeList.querySelectorAll('button');
    if(buttons.length===0){
      return;
    }
    const activeElement=document.activeElement;
    let nextIndex=0;
    buttons.forEach((button,index)=>{
      if(button===activeElement){
        nextIndex=index+1;
      }
    });
    if(nextIndex>=buttons.length){
      nextIndex=0;
    }
    (buttons[nextIndex] as HTMLButtonElement).focus();
  }

  // キーボードを無効化

document.body.appendChild(document.createElement('textarea')).innerHTML='ここには書けない'; // テキストエリアを追加して、IMEの入力を受け付ける

document.getElementById('downloadButton')!.addEventListener('click', () => {
  //csv形式でデータを整形
  let csvContent = "";
  let formatData:keydata[]=[];
  resultData.forEach((data) => {
    const key = data.key;
    if(!formatData.find((d) => d.key === key)){
      formatData.push({key: key, values: []});
    }else{
      const index=formatData.findIndex((d) => d.key === key);
      formatData[index].values.push(...data.values);
    }
  });
  let table : string[][] = [];
  let keysList:string[]=[];
  let timeList:number[]=[];
  
  formatData.forEach((data) => {
    const key = data.key;
    keysList.push(key);
    data.values.forEach((value) => {
      const time=value.y;
      if(!timeList.includes(time)){
        timeList.push(time);
      }
    });
  });
  timeList.sort();
  
  
  table.unshift(['time', ...timeList.map(t => t.toString())]); // ヘッダー行を追加
  formatData.forEach((data) => {
    const key = data.key;
    let row:number[] = [];
    timeList.forEach((time) => {
      const value = data.values.find((v) => v.y === time);
      if(value){
        row.push(value.x);
      }else{
        row.push(0);
      }
    });
    table.push([key, ...row.map(x => x.toString())]);
  });
  let i=0;
  table.forEach((row) => {
    csvContent +=  row.join(",") + "\n";
    i++;
  });
  downLoadTXT(csvContent, 'result_data.csv');
});

function downLoadTXT(text: string, filename: string) {
    // TXTをダウンロードする
    let blob = new Blob([text], {type: "text/plain"});
    let link = document.createElement("a"); // aタグのエレメントを作成
    link.href = window.URL.createObjectURL(blob);
    link.download = filename;
    link.click();
}


