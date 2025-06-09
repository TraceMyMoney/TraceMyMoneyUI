<template>
    <v-sheet
      class="mx-auto w-lg-75 w-100 mb-8 mt-10 d-sm-block d-none"
      elevation="8"
    >
        <v-slide-group
            v-model="model"
            :class="['pa-4', 'd-flex', {'bg-grey-darken-4': getIsDarkMode}]"
            show-arrows="false"
            mobile="true"
        >
            <v-slide-group-item
                v-for="(bank, index) in getBanksList"
                :key="index"
                v-slot="{ isSelected, toggle }"
            >
                <div @click="handleBankClick(bank)">
                    <v-card
                        height="300"
                        width="300"
                        @click="toggle"
                        :class="['mr-4', {'bg-grey-darken-4': getIsDarkMode}, {'bg-success': isSelected}]"
                    >
                        <v-chip color="red custom-chip" @click="deleteBankSoft(bank.bankId)">
                            <v-icon color="red">
                                mdi-delete
                            </v-icon>
                        </v-chip>
                        <v-scale-transition>
                            <v-row class="mt-4">
                                <v-col cols="12" class="text-center">
                                    <v-card-title class="text-h2">{{ bank.bankName }}</v-card-title>
                                </v-col>
                                <v-col cols="12" class="text-center">
                                    <v-card-subtitle class="text-h2">{{ this.getPrivacyModeEnabled ? "--" : bank.remainingBalance }}</v-card-subtitle>
                                </v-col>
                            </v-row>
                        </v-scale-transition>
                    </v-card>
                </div>
            </v-slide-group-item>
            <v-slide-group-item>
                <v-card
                    height="300"
                    width="300"
                    @click="() => {setCreateBankDialogVisible(true)}"
                    :class="[{'bg-grey-darken-4': getIsDarkMode}]"
                >
                    <v-row class="mt-2">
                        <v-col cols="12" class="text-center">
                            <v-card-title class="text-h2">
                                <v-col cols="12" class="text-center">
                                    <v-card-title class="text-h2 "> Create </v-card-title>
                                    <v-card-title class="text-h2 ">Bank</v-card-title>
                                </v-col>
                            </v-card-title>
                        </v-col>
                        <v-col cols="12" class="text-center">
                            <v-card-subtitle class="text-h2"></v-card-subtitle>
                        </v-col>
                    </v-row>
                </v-card>
            </v-slide-group-item>
        </v-slide-group>
    </v-sheet>
    <v-sheet :class="['mt-10', 'd-sm-none','mb-10', {'bg-grey-darken-4': getIsDarkMode}, 'overflow-scroll-bank', 'mx-auto']">
        <v-item-group
            v-model="selection"
        >
        <v-row>
          <v-col
            v-for="(bank, index) in getBanksList"
            :key="index"
            cols="6"
            class="d-flex justify-center align-center"
          >
            <v-item v-slot="{ isSelected, toggle }">
                <div @click="handleBankClick(bank)">
                    <v-card
                        height="150"
                        width="150"
                        @click="toggle"
                        :class="['elevation-10', {'bg-grey-darken-4': getIsDarkMode}, {'bg-success': isSelected}]"
                    >
                        <v-chip size="x-small" color="red custom-chip" @click="deleteBankSoft(bank.bankId)">
                            <v-icon color="red">
                                mdi-delete
                            </v-icon>
                        </v-chip>
                        <v-scale-transition>
                            <v-row class="mt-1">
                                <v-col cols="12" class="text-center">
                                    <v-card-title class="text-h6">{{ bank.bankName }}</v-card-title>
                                </v-col>
                                <v-col cols="12" class="text-center">
                                    <v-card-subtitle class="text-h5">{{ this.getPrivacyModeEnabled ? "--" : bank.remainingBalance }}</v-card-subtitle>
                                </v-col>
                            </v-row>
                        </v-scale-transition>
                    </v-card>
                </div>
            </v-item>
          </v-col>
          <v-col
            cols="6"
            class="d-flex justify-center align-center"
          >
          <v-item v-slot="{ isSelected, toggle }">
            <v-card
                    height="150"
                    width="150"
                    @click="() => {setCreateBankDialogVisible(true)}"
                    :class="[{'bg-grey-darken-4': getIsDarkMode}, 'elevation-10']"
                >
                    <v-row >
                        <v-col cols="12" class="text-center">
                            <v-card-title class="text-h2">
                                <v-col cols="12" class="text-center">
                                    <v-card-title class="text-h6 "> Create </v-card-title>
                                    <v-card-title class="text-h6 ">Bank</v-card-title>
                                </v-col>
                            </v-card-title>
                        </v-col>
                        <v-col cols="12" class="text-center">
                            <v-card-subtitle class="text-h6"></v-card-subtitle>
                        </v-col>
                    </v-row>
                </v-card>
          </v-item>
          </v-col>
        </v-row>
      </v-item-group>
    </v-sheet>
</template>
<style>
  .custom-chip {
    position: absolute !important;
    top: 10px;
    right: 10px;
    z-index: 9999;
  }
</style>
<script>
import { traceMyMoneyStore } from "@/stores/traceMyMoneyStore";
import { mapActions, mapState } from 'pinia'

export default {
    data() {
        return  {
            model: 0,
            selection: 0,
        }
    },
    computed: {
        ...mapState(traceMyMoneyStore, [
            "getBanksList",
            "getIsDarkMode",
            "getPrivacyModeEnabled"
        ])
    },
    methods: {
        ...mapActions(traceMyMoneyStore, [
            "setCreateBankDialogVisible",
            "fetchFilteredExpensesList",
            "deleteBank"
        ]),
        handleBankClick(bank) {
            this.fetchFilteredExpensesList(bank)
        },
        deleteBankSoft(bankId) {
            if (confirm("Do you really want to delte this bank ?")) {
                this.deleteBank(bankId)
            }
        }
    },
}
</script>
<style>
.overflow-scroll-bank {
    height: 200px;
    overflow-y: scroll;
    overflow-x: hidden;
    width: 95%;
}
</style>
