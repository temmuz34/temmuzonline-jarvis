'use strict';
function periods(now=new Date(),lag=1){
 const end=new Date(now);end.setUTCDate(end.getUTCDate()-lag);
 const day=n=>{const d=new Date(end);d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10);};
 return {current:{startDate:day(-6),endDate:day(0)},previous:{startDate:day(-13),endDate:day(-7)}};
}
const delta=(current,previous)=>previous?100*(current-previous)/previous:null;
module.exports={periods,delta};
