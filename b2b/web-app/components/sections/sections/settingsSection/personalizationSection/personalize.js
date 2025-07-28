/**
 * Copyright (c) 2023, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
 *
 * WSO2 LLC. licenses this file to you under the Apache License,
 * Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import logoImage from "../../../../../public/logo.svg";
import favicon from "../../../../../public/favicon.png";
const { useThemeStore } = require("../../../theme-store");

function changeFavicon(newFaviconUrl) {
    const head = document.head || document.getElementsByTagName("head")[0];

    // Remove existing favicon, if any
    const existingFavicons = document.querySelectorAll("link[rel='icon']");

    existingFavicons.forEach(favicon => {
        head.removeChild(favicon);
    });

    // Create a new link tag for the new favicon
    const newFavicon = document.createElement("link");

    newFavicon.type = "image/x-icon";
    newFavicon.rel = "icon";
    newFavicon.href = newFaviconUrl;

    // Append the new favicon to the head
    head.appendChild(newFavicon);
}

function updateOrganizationLogo(newSrc, newAlt) {
    const petCareLogos = document.querySelectorAll(".teamspace-logo");

    petCareLogos.forEach(logo => {

        // Change the src to a temporary value to force a reload
        logo.src = "";
        logo.alt = "";
        logo.removeAttribute("srcset");

        // Set a timeout to change the src to the new value after a short delay
        setTimeout(() => {
            logo.src = newSrc;
            logo.alt = newAlt;
        }, 100); // Change to suit your needs, 100 milliseconds used here as an example
    });
}

function changeColorTheme(primary, secondary) {
    useThemeStore.getState().setColors(primary, secondary);
}

export function personalize(personalization) {
    changeColorTheme(personalization.primaryColor, personalization.secondaryColor);
    changeFavicon(personalization.faviconUrl);
    updateOrganizationLogo(personalization.logoUrl, personalization.logoAltText);
}

export function resetPersonalization() {
    useThemeStore.getState().resetColors();
    changeFavicon(favicon.src);
    updateOrganizationLogo(logoImage.src, "TeamSpace Logo");
}

export default personalize;
