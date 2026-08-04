<script setup lang="ts">


const emit = defineEmits<{
 upload:[file:File]
}>()



function handleUpload(
 event: Event
){

const input =
 event.target as HTMLInputElement


const file =
 input.files?.[0]


if(!file){
 return
}


if(!file.name.endsWith('.csv')){

 alert(
  'Please upload a CSV file.'
 )

 return

}


emit(
 'upload',
 file
)


}


</script>



<template>

<div>

<UFormField
 label="Upload CSV file"
>


<UInput
 type="file"
 accept=".csv"
 @change="handleUpload"
/>


</UFormField>


</div>

</template>