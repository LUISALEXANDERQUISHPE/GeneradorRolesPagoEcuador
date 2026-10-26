import test from 'node:test'
import assert from 'node:assert/strict'
import { saveScale } from '../src/db/repositories/escalasRepository.js'
import { inicioFondos, assertRegimen } from '../src/utils/regimenes.js'

test('escala valida valores y transmite código como parámetro SQL',async()=>{
 let calls=0
 await saveScale({codigo:"A1'; --",sueldo:'600.50',regimen:'codigo_trabajo'},async(sql,args)=>{
  calls++;assert.equal(sql.includes("A1'; --"),false);assert.equal(args[1],"A1'; --");assert.equal(args[3],'600.50')
 })
 assert.equal(calls,1)
 for(const sueldo of ['0','-1','NaN','20.123']) await assert.rejects(saveScale({codigo:'A1',sueldo,regimen:'codigo_trabajo'},()=>assert.fail('No debe consultar')))
})
test('aniversario de fondos, fin de mes y febrero bisiesto',()=>{
 assert.equal(inicioFondos('2025-06-16'),'2026-06-16')
 assert.equal(inicioFondos('2024-02-29'),'2025-02-28')
 assert.equal(inicioFondos('2025-01-31'),'2026-01-31')
})
test('otros regímenes no reutilizan el cálculo privado silenciosamente',()=>{
 assert.doesNotThrow(()=>assertRegimen({regimen_laboral:'codigo_trabajo'}))
 for(const regimen_laboral of ['losep','loep','loei','loes','especial','invalido']) assert.throws(()=>assertRegimen({regimen_laboral}),/no está implementado/)
})
