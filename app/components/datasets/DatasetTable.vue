
<script setup lang="ts">

import type { Dataset } from '#shared/schemas'


defineProps<{
  datasets: Dataset[]
}>()



const BUSINESS_TYPE_LABELS: Record<string,string> = {

  restaurant: 'Restaurant',
  retail: 'Shop',
  gym: 'Gym'

}


</script>


<template>

<UTable
:data="datasets"
:columns="[

{
 accessorKey:'name',
 header:'Name'
},

{
 accessorKey:'businessType',
 header:'Type'
},

{
 accessorKey:'periodStart',
 header:'Covers'
},

{
 accessorKey:'rowCount',
 header:'Rows'
}

]"
>


<template #businessType-cell="{row}">

{{
BUSINESS_TYPE_LABELS[row.original.businessType]
?? row.original.businessType
}}

</template>



<template #periodStart-cell="{row}">

{{row.original.periodStart}}
to
{{row.original.periodEnd}}

</template>



<template #rowCount-cell="{row}">

{{row.original.rowCount}}

</template>


</UTable>

</template>
