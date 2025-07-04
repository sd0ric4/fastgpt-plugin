import { defineTool } from '@tool/type';
import {
  FlowNodeInputTypeEnum,
  FlowNodeOutputTypeEnum,
  WorkflowIOValueTypeEnum
} from '@tool/type/fastgpt';
import { ToolTypeEnum } from '@tool/type/tool';

export default defineTool({
  toolId: 'community-smtpEmail',
  type: ToolTypeEnum.communication,
  name: {
    'zh-CN': 'Email 邮件发送',
    en: 'SMTP Email'
  },
  description: {
    'zh-CN': '通过SMTP协议发送电子邮件(nodemailer)',
    en: 'Send email by SMTP protocol (nodemailer)'
  },
  icon: 'plugins/email',
  versionList: [
    {
      value: '0.1.0',
      description: 'Default version',
      inputs: [
        {
          key: 'system_input_config',
          label: '',
          renderTypeList: [FlowNodeInputTypeEnum.hidden],
          valueType: WorkflowIOValueTypeEnum.object,
          defaultValue: {
            type: 'system'
          },
          inputList: [
            {
              key: 'smtpUser',
              label: 'smtpUser',
              description: 'SMTP用户名, 邮箱账号',
              required: true,
              inputType: 'string'
            },
            {
              key: 'smtpPass',
              label: 'smtpPass',
              description: '邮箱密码或授权码',
              required: true,
              inputType: 'string'
            }
          ]
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'smtpHost',
          label: 'smtpHost',
          description: '',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: true,
          customInputConfig: {
            selectValueTypeList: ['string']
          }
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'smtpPort',
          label: 'smtpPort',
          description: 'SMTP端口',
          defaultValue: '465',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: true
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.select, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'SSL',
          label: 'SSL',
          description: 'SSL',
          defaultValue: 'true',
          list: [
            {
              label: 'true',
              value: 'true'
            },
            {
              label: 'false',
              value: 'false'
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: true
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'fromName',
          label: 'fromName',
          description: '显示的发件人名称',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: true
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'to',
          label: 'to',
          description: '请输入收件人邮箱，多个邮箱用逗号分隔',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: true,
          toolDescription: '请输入收件人邮箱，多个邮箱用逗号分隔'
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'subject',
          label: 'subject',
          description: '请输入邮件主题',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: true,
          toolDescription: '请输入邮件主题'
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'content',
          label: 'content',
          description: '请输入邮件内容，支持HTML格式',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: true,
          toolDescription: '请输入邮件内容，支持HTML格式'
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'cc',
          label: 'cc',
          description: '请输入抄送邮箱，多个邮箱用逗号分隔',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: false,
          toolDescription: '请输入抄送邮箱，多个邮箱用逗号分隔'
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.input, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'bcc',
          label: 'bcc',
          description: '请输入密送邮箱，多个邮箱用逗号分隔',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: false,
          toolDescription: '请输入密送邮箱，多个邮箱用逗号分隔'
        },
        {
          renderTypeList: [FlowNodeInputTypeEnum.JSONEditor, FlowNodeInputTypeEnum.reference],
          selectedTypeIndex: 0,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'attachments',
          label: 'attachments',
          description: '必须是json数组格式\n[{"filename":"附件名","path":"附件url"}]',
          defaultValue: '',
          list: [
            {
              label: '',
              value: ''
            }
          ],
          maxFiles: 5,
          canSelectFile: true,
          canSelectImg: true,
          required: false,
          customInputConfig: {
            selectValueTypeList: ['arrayObject']
          },
          toolDescription: '必须是json数组格式\n[{"filename":"附件名","path":"附件url"}]',
          maxLength: 0
        }
      ],
      outputs: [
        {
          id: 'result',
          type: FlowNodeOutputTypeEnum.static,
          valueType: WorkflowIOValueTypeEnum.string,
          key: 'result',
          label: '发送结果',
          description: '发送结果'
        }
      ]
    }
  ]
});
