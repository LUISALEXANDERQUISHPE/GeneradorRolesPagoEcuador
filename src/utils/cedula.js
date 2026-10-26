export function validarCedula(value) {
 if (!/^\d{10}$/.test(value)) return false
 const province=Number(value.slice(0,2))
 if (!((province>=1 && province<=24)||province===30) || Number(value[2])>=6) return false
 const sum=[...value.slice(0,9)].reduce((total,digit,i)=>{let n=Number(digit)*(i%2===0?2:1);return total+(n>9?n-9:n)},0)
 return (10-sum%10)%10===Number(value[9])
}
