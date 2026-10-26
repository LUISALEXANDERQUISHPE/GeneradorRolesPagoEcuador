import { ref } from 'vue'
import { defineStore } from 'pinia'
import { listEmployees } from '../db/repositories/empleadosRepository.js'
export const useEmpleadosStore=defineStore('empleados',()=>{
 const items=ref([]),loading=ref(false),error=ref('')
 async function load(){loading.value=true;error.value='';try{items.value=await listEmployees();return true}catch(e){error.value=e.message;return false}finally{loading.value=false}}
 return {items,loading,error,load}
})
