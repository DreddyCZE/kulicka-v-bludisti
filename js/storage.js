const KEY='kouzelnaZahradaSaveV3';
const defaults={level:1,totalStars:0,hero:'lili',wins:0};
export function loadSave(){try{return {...defaults,...JSON.parse(localStorage.getItem(KEY)||'{}')}}catch{return {...defaults}}}
export function saveGame(data){localStorage.setItem(KEY,JSON.stringify(data))}
