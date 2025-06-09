<template>
    <v-app-bar scroll-behavior="hide" :class="[{'bg-grey-darken-4': getIsDarkMode}]">
      <v-container class="w-lg-75 w-100">
        <div class="d-flex w-lg-75 mx-auto justify-space-between align-center">
          <div class="d-flex align-center">
            <v-img
              :src="currentThemeIcon"
              width="24"
              height="24"
              class="cursor-pointer"
              @click="makeBgWhiteSoft"
            />&nbsp;&nbsp;&nbsp;
            <span
              @click="reloadPage"
              class="text-sm-h5 text-md-h4 text-h6 cursor-pointer dynapuff text-success">
              Trace My Money
            </span>
          </div>
          <span>
            <span v-if="getLoggedInStatus" class="text-success dynapuff d-flex align-center">
              <v-switch v-model="getPrivacyModeEnabled" @click="updatePrivacyMode" class="mr-3 d-flex"></v-switch>
              Hello@{{ getUserName }}
              <span
                color="primary"
                class="cursor-pointer"
              >
                <v-icon
                  icon="mdi-logout"
                  end
                  @click="logoutUser"
                ></v-icon>
              </span>
            </span>
            <div v-else>
              <v-btn-toggle
                color="success"
                v-model="toggleLogin"
                :class="['custom-btn-toggle', {'bg-grey-darken-4': getIsDarkMode}]"
              >
                <v-btn @click="() => { setLoginPageStatus(true) }" :class="['custom-btn', {'bg-grey-darken-4': getIsDarkMode}]">Login</v-btn>
                <v-btn @click="() => { setLoginPageStatus(false) }" :class="['custom-btn', {'bg-grey-darken-4': getIsDarkMode}]">Register</v-btn>
              </v-btn-toggle>
            </div>
          </span>
        </div>
      </v-container>
    </v-app-bar>
</template>

<script>
import { traceMyMoneyStore } from "@/stores/traceMyMoneyStore";
import { mapActions, mapState } from 'pinia'
import darkmode from '@/assets/darkmode.svg';
import whitemode from '@/assets/whitemode.svg';

export default {
    data() {
      return {
        toggleLogin: 0,
        isBgDark: false
      }
    },
    computed: {
      ...mapState(traceMyMoneyStore, [
        "getUserName",
        "getLoggedInStatus",
        "getIsDarkMode",
        "getPrivacyModeEnabled"
      ]),
      currentThemeIcon() {
        return this.getIsDarkMode ? whitemode : darkmode;
      }
    },
    methods: {
      ...mapActions(traceMyMoneyStore, [
        "logoutUser",
        "setLoginPageStatus",
        "setIsDarkMode",
        "updateUserPreferences"
      ]),
      reloadPage() {
        location.reload()
      },
      makeBgWhiteSoft(){
        this.updateUserPreferences({"is_dark_mode":!this.getIsDarkMode})
      },
      updatePrivacyMode() {
        this.updateUserPreferences({"privacy_mode_enabled": !this.getPrivacyModeEnabled})
      }
    }
}
</script>

<style lang="scss">
@import url('https://fonts.googleapis.com/css2?family=DynaPuff:wdth@95.6&display=swap');

.dynapuff {
  font-family: "DynaPuff", serif !important;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
  font-variation-settings:
    "wdth" 95.6;
}
</style>