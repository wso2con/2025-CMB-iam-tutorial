/**
 * Copyright (c) 2025, WSO2 LLC. (https://www.wso2.com). All Rights Reserved.
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

import { requestOptionsWithBody } from "@teamspace-app/data-access-common-api-util";
import {
  RequestMethod,
  dataNotRecievedError,
  notPostError,
} from "@teamspace-app/shared/data-access/data-access-common-api-util";
import { getOrgUrl } from "@teamspace-app/shared/util/util-application-config-util";
import { NextApiRequest, NextApiResponse } from "next";

export default async function patchRole(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== "POST") {
    notPostError(res);
  }

  const body = JSON.parse(req.body);
  const accessToken = body.accessToken;
  const userId = body.userId;
  const session = body.session;
  const patchBody = body.param;
  const roleId = req.query.roleId;
  const orgId = "";

  try {
    const fetchData = await fetch(
      `${getOrgUrl(orgId)}/scim2/v2/Roles/${roleId}`,
      session
        ? requestOptionsWithBody(session, RequestMethod.PATCH, patchBody)
        : {
            method: "PATCH",
            headers: {
              Authorization: `Bearer ${accessToken}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              Operations: [
                { op: "add", path: "users", value: [{ value: userId }] },
              ],
            }),
          }
    );

    const data = await fetchData.json();

    if (!fetchData.ok) {
      return res.status(fetchData.status).json(data);
    }

    res.status(fetchData.status).json(data);
  } catch (err) {

    return dataNotRecievedError(res);
  }
}
