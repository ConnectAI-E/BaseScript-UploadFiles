// @ts-ignore
import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Button, Upload, UploadFile, UploadProps, Table, Form, Select, FormInstance, Switch, notification, Spin, Collapse, message, Checkbox } from 'antd'
import { UploadOutlined, FileAddOutlined, CloudUploadOutlined } from '@ant-design/icons';
import Editor from './codeEditor';
import './style.css'
import { FieldType, IBaseViewMeta, IFieldMeta, IOpenAttachment, IOpenCellValue, IWidgetField, IWidgetTable, IWidgetView, TableMeta, ViewType, bitable } from '@lark-base-open/js-sdk';
import { fieldIcons } from './icons'
import TextArea from 'antd/es/input/TextArea';
//@ts-ignore
window._reg = /[\n]+/g
enum UploadFileActionType {
    /** 自定义pickFile函数.. */
    GetFileByName = 0,
    /** 新增一行记录并依次上传文件，一行记录对应一个文件 */
    AddNewRecord = 1
}

function getTemp() {
    return [{
        code: `//${t('code.23')}
/**
 * ${t('code.24')}
 * ${t('code.25')}
 * ${t('code.26')}
 */
function pickFile({ compareValues, fileList, currentValue }) {
    const reg = window._reg || /[,，。、;；\s]+/g
    let firstCelValue = compareValues[0]
    if (!Array.isArray(firstCelValue)) {
        // ${t('code.7')}
        return currentValue
    }

    firstCelValue = firstCelValue.map(({ text }) => text).join('').replace(reg, ',').split(',')

    const files = fileList.filter((file) => {
        // ${t('code.9')}
        const fileName = file.name.split('.')[0]
        // ${t('code.10')}
        return firstCelValue.includes(fileName)

    })

    if (files.length) {
        return files;
    }

    return currentValue // ${t('code.21')}
}`,
        desc: t('upload.by.name.desc'),
        title: t('upload.by.name.title'),
        type: UploadFileActionType.GetFileByName,
        default: false,
    },
    {
        desc: t('upload.by.new.record'),
        title: t('upload.by.new.record.title'),
        type: UploadFileActionType.AddNewRecord,
        default: true,
        code: '',
    }
    ]
}


/** 选择上传模式 */
function ChooseTemp({ onChange }: { onChange: (arg: any) => any }) {

    const functionsExample = useMemo(() => getTemp(), [])
    const [type, setType] = useState(functionsExample.find((v) => v.default)?.type)

    return <div>
        <Select
            style={{ width: '100%' }}
            defaultValue={functionsExample.find((v) => v.default)?.type}
            options={functionsExample.map(({ code, desc, title, type }) => {
                return { value: type, label: title }
            })}
            onChange={(v) => {
                onChange(v);
                setType(v)
            }}>
        </Select>
        <p>
            {functionsExample.find((v) => v.type === type)!.desc}
        </p>
    </div>

}



/** 文件和上传完成的token */
const fielTokenMap = new Map<File, string>()

/* 记录需要改动的记录,null清空，undefined表示使用原来的值 */
const recordFiles = new Map<string, (File | IOpenAttachment)[] | null | undefined>()

export default function RefreshCom() {
    const [selectionChange, setSelectionChange] = useState<any>();
    useEffect(() => {
        bitable.base.getSelection().then(({ tableId }) => {
            setSelectionChange(tableId)
        })
        bitable.base.onSelectionChange((selection) => {
            setSelectionChange(selection.data.tableId);
        })
    }, [])
    if (!selectionChange) {
        return null
    }

    return <div>
        <UploadFileToForm key={selectionChange || '0'} />
    </div>
}


function UploadFileToForm() {
    const functionsExample = useMemo(() => getTemp(), [])
    const [fileList, setFileList] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const defaultMode = functionsExample.find((v) => v.default)!
    // 已上传完成
    const [uploadEnd, setUploadEnd] = useState(false)

    // 预览表格是否符合表单所选项目
    const [preTableFitForm, setPreTableFitForm] = useState(false)
    const [loadingContent, setLoadingContent] = useState('')
    const [fieldMetaList, setFieldMetaList] = useState<IFieldMeta[]>()

    const [PreTable, setPreTable] = useState<any>(null)

    const [uploadActionType, setUploadActionType] = useState(defaultMode.type)

    const codeEditorValue = useRef(defaultMode.code)
    const [form] = Form.useForm()
    const tableInfo = useRef<
        {
            tableId: string,
            table: IWidgetTable,
            tableMetaList: TableMeta[],
            viewMetaList: IBaseViewMeta[],
            view: IWidgetView | null,
            attatchmentField: IWidgetField,
            viewRecordIdList: string[],
            // 所用到的值列表
            comparesFieldValueList: {
                [fieldId: string]: {
                    [recordId: string]: IOpenCellValue
                }
            },
            /** 已经存在的文件值的列表 */
            exitFileValueList: {
                [recordId: string]: any[]
            }
        }
    >()

    const updateTableInfo = async () => {
        setLoading(true)

        return bitable.base.getSelection().then(async ({ tableId, viewId }) => {

            const [table, tableMetaList] = await Promise.all([
                bitable.base.getTableById(tableId!),
                bitable.base.getTableMetaList()
            ])

            const view = await table.getViewById(viewId!);
            const fieldMetaList = await view.getFieldMetaList();
            const viewMetaList = await table.getViewMetaList();
            setFieldMetaList(fieldMetaList)
            if (!fieldMetaList.some(({ type }) => type === FieldType.Attachment)) {
                message.error(t('file.field.missing'));
            }
            const viewRecordIdList = await view.getVisibleRecordIdList() as any;
            tableInfo.current = {
                ...tableInfo.current || {}
                , tableId: tableId!,
                table,
                view,
                tableMetaList,
                viewRecordIdList,
                viewMetaList: viewMetaList.filter(({ type }) => type === ViewType.Grid),
            } as any;
            setLoading(false);
        })
    }


    useEffect(() => {
        updateTableInfo()
    }, [])

    useMemo(() => {
        codeEditorValue.current = functionsExample.find((v) => v.type === uploadActionType)!.code
    }, [uploadActionType])



    const onSelectTable = async (tableId: string) => {
        setLoading(true)
        setFieldMetaList([])
        form.setFieldsValue({
            viewId: undefined,
            fileFieldId: undefined,
            compares: undefined
        })

        tableInfo.current!.tableId = tableId;
        const table = await bitable.base.getTableById(tableId)
        const viewMetaList = await table.getViewMetaList()

        tableInfo.current = {
            ...tableInfo.current,
            tableId,
            viewMetaList: viewMetaList.filter(({ type }) => type === ViewType.Grid),
            table,
            view: null,
            viewRecordIdList: [],
        } as any
        const fieldMetaList = await table.getFieldMetaList();
        setFieldMetaList(fieldMetaList)
        setLoading(false)
    }

    const onSelectView = async (viewId: string) => {
        setLoading(true)
        const { table } = tableInfo.current!
        form.setFieldsValue({
            fileFieldId: undefined,
            compares: undefined
        })
        const view = await table.getViewById(viewId);
        const viewRecordIdList = await view.getVisibleRecordIdList();
        const fieldMetaList = await view.getFieldMetaList();
        setFieldMetaList(fieldMetaList)
        tableInfo.current = {
            ...tableInfo.current,
            viewRecordIdList: viewRecordIdList.filter((recordId) => recordId) as any,
            view,
        } as any
        setLoading(false)
    }


    const onClickUpload = async () => {
        const fieldId: string = form.getFieldValue('fileFieldId');
        const table = tableInfo.current?.table
        setLoading(true)
        setLoadingContent('')
        try {
            for (const [recordId, files] of recordFiles) {
                if (files === undefined) {
                    continue;
                }
                if (files === null) {
                    await table?.setCellValue(fieldId, recordId, null);
                    continue
                }

                const timeStamp = new Date().getTime();
                const currentUploadingFies: string = files.map(({ name }) => name).join('，');
                setLoadingContent(t('uploading.now') + currentUploadingFies)
                const allFilesToBeUpload: File[] = files.filter((f) => (f instanceof File) && !fielTokenMap.has(f)) as any
                for (let index = 0; index < allFilesToBeUpload.length; index += 5) {
                    const elements: (File)[] = allFilesToBeUpload.slice(index, index + 5)

                    let tokens: string[] = []
                    if (elements.length) {
                        tokens = await bitable.base.batchUploadFile(elements);
                    }
                    elements.forEach((f, index) => {
                        if (typeof f === 'object') {
                            fielTokenMap.set(f, tokens[index]);
                        }
                    })
                }

                const cellValue: IOpenAttachment[] = files.map((f) => {
                    if (!(f instanceof File)) {
                        return f
                    }

                    return {
                        name: f.name,
                        size: f.size,
                        type: f.type,
                        token: fielTokenMap.get(f)!,
                        timeStamp,
                    }
                })
                await table?.setCellValue(fieldId, recordId, cellValue)

            }
            setUploadEnd(true)

        } catch (error) {
            message.error(t('upload.error') + '\n' + String(error))
        }
        setLoadingContent('')
        setLoading(false)
    }


    const onFinish = async () => {

        const { tableId, fileFieldId, compares, overWriteFile } = form.getFieldsValue();
        const table = await bitable.base.getTableById(tableId)

        await updateTableInfo();
        if (uploadActionType === UploadFileActionType.AddNewRecord) {
            setLoading(true);
            setPreTable(undefined)
            setLoadingContent('')
            try {
                for (let index = 0; index < fileList.length; index += 5) {
                    const timeStamp = new Date().getTime();
                    const files = fileList.slice(index, index + 5);
                    const filesName = files.map((f) => f.name).join('，')
                    setLoadingContent(t('uploading.now') + filesName);

                    const tokens = await bitable.base.batchUploadFile(files)

                    const cellValue: IOpenAttachment[] = tokens.map((token, i) => ({
                        token,
                        name: files[i].name,
                        size: files[i].size,
                        type: files[i].type,
                        timeStamp
                    }))
                    await table.addRecords(cellValue.map((v) => ({
                        fields: {
                            [fileFieldId]: [v]
                        }
                    })))
                }
                message.success(t('upload.end'))
            } catch (error) {
                message.error(t('upload.error'))
            }
            setLoading(false);
            setLoadingContent('')
            return;
        }

        if (uploadActionType === UploadFileActionType.GetFileByName) {
            const code = codeEditorValue.current
            //@ts-ignore
            window.pickFile = undefined;
            setLoading(true)
            setLoadingContent('')
            setUploadEnd(false)
            try {
                eval('window.pickFile =' + code.trim())
                //@ts-ignore
                if (typeof window.pickFile !== 'function') {
                    throw new Error()
                }
                //@ts-ignore
                const pickFile: (arg: any) => File[] = window.pickFile

                const comparesFieldValueList: {
                    [fieldId: string]: {
                        [recordId: string]: IOpenCellValue
                    }
                } = Object.fromEntries(await Promise.all(compares.map(async (fieldId: string) => {
                    const field = await table.getFieldById(fieldId)
                    const valueList = await field.getFieldValueList();
                    const values = Object.fromEntries(valueList.map(({ record_id, value }) => [record_id, value]))
                    return [fieldId, values]
                })))
                const fileField = await table.getFieldById(fileFieldId)
                const fileFieldValue = await fileField.getFieldValueList();
                tableInfo.current!.exitFileValueList = Object.fromEntries(fileFieldValue.map(({ value, record_id }) => {
                    return [record_id, value]
                }))

                tableInfo.current!.comparesFieldValueList = comparesFieldValueList
                try {
                    setLoadingContent(t('is.matching'))
                    setLoading(true)

                    setTimeout(() => {
                        tableInfo.current?.viewRecordIdList.map((recordId) => {
                            const currentFileFieldValue = tableInfo.current?.exitFileValueList[recordId]
                            // 和所选一样的顺序
                            const compareValues = compares.map((fieldId: string) => comparesFieldValueList[fieldId][recordId])
                            const files = pickFile({ fileList, compareValues, currentValue: currentFileFieldValue }) || []

                            if (!overWriteFile) {
                                if (currentFileFieldValue) {
                                    recordFiles.set(recordId, undefined)
                                } else {
                                    recordFiles.set(recordId, files?.length ? files : null)
                                }
                            } else {
                                recordFiles.set(recordId, files?.length ? files : null)
                            }
                        })
                        setPreTable(
                            getPreviewTable({
                                fieldsMetaList: fieldMetaList!,
                                fileFieldId,
                                recordFiles,
                                allRecordsIds: tableInfo.current?.viewRecordIdList!,
                                compares,
                                overWriteFile,
                                exitFileValueList: tableInfo.current!.exitFileValueList,
                                comparesFieldValueList
                            })
                        )



                        setPreTableFitForm(true)

                        setLoadingContent('')
                        setTimeout(() => {
                            const tableContainer = document.getElementById('btnsContainer');
                            tableContainer!.scrollIntoView(true);
                            setLoading(false);
                        }, 1000);

                    });


                } catch (error) {
                    message.error(t('function.error') + '\n' + String(error))
                    setLoading(false);
                    setLoadingContent('')

                }


                // const 
            } catch (error) {
                message.error(t('function.dealare.error'))
                setLoadingContent('')
                setLoading(false)
            }
        }
    }


    if (!tableInfo.current) {
        return <div className='suspense-loading'>
            <div className="lds-roller"><div></div><div></div><div></div><div></div><div></div><div></div><div></div><div></div></div>
        </div>
    }
    return (
        <div>
            <Spin
                tip={loadingContent}
                spinning={loading}
            >

                <div id='container' className='container'>
                    <Form
                        onFinish={onFinish}
                        form={form}>
                        {/* 选择表格 */}
                        <Form.Item
                            hidden
                            rules={[{ required: true }]}
                            name='tableId'
                            initialValue={tableInfo.current.tableId} label={t('select.table')}>
                            <Select
                                onChange={(tableId) => {
                                    onSelectTable(tableId);
                                    setPreTableFitForm(false)
                                }}
                                options={tableInfo.current.tableMetaList.map(({ id, name }) => ({ label: name, value: id }))}
                            >
                            </Select>
                        </Form.Item>

                        {/* 选择视图 */}
                        <Form.Item
                            rules={[{ required: true }]}
                            hidden
                            name='viewId'
                            initialValue={tableInfo.current.view?.id} label={t('select.view')}>
                            <Select
                                onChange={onSelectView}
                                options={tableInfo.current.viewMetaList?.map(({ id, name, type }) => ({ label: name, value: id }))}
                            >
                            </Select>
                        </Form.Item>


                        <Form.Item style={{ marginBottom: '0' }} label={t('choose.mode')}>
                            <ChooseTemp onChange={(v) => setUploadActionType(v)} />
                        </Form.Item>

                        <div key={uploadActionType}>
                            {uploadActionType === UploadFileActionType.GetFileByName && [<Form.Item
                                name='compares'

                                tooltip={t('compares.tooltip')}
                                initialValue={[fieldMetaList?.[0]?.id]}
                                label={t('select.pickField')}>
                                <Select
                                    mode='multiple'
                                    options={fieldMetaList?.map(({ id, name, type }) => ({
                                        label:
                                            // @ts-ignore
                                            <div className='filedIconContainer'>{fieldIcons[type]} {name}</div>,
                                        value: id
                                    }))}
                                >
                                </Select>
                            </Form.Item>,
                            <Collapse size='small' items={[{
                                key: '1', label: t('pickFile.label'),
                                children: <Editor defaultValue={codeEditorValue.current}
                                    onChange={(v) => { codeEditorValue.current = v }} />
                            }]} defaultActiveKey={['-1']} />,
                            <br />,
                            <Form.Item initialValue={['\n']} rules={[{ required: true }]}
                                tooltip={t('self.reg.tooltip')} label={t('self.reg')}>

                                <Checkbox.Group
                                    onChange={(v) => {
                                        if (!v || !v?.length) {
                                            // @ts-ignore
                                            window._reg = /[]+/g
                                            return;
                                        }
                                        // @ts-ignore
                                        window['_reg'] = new RegExp(`[${v.join('')}]+`, 'g')
                                    }}
                                    defaultValue={['\n']}
                                    options={[
                                        { label: t('space'), value: ' ' },
                                        { label: t('e'), value: '\n' },
                                        { label: '#', value: '#' },
                                        { label: '\\', value: '\\\\' },
                                        { label: '/', value: '/' },
                                        { label: '|', value: '|' },
                                        { label: '，', value: '，' },
                                        { label: '；', value: '；' },
                                        { label: ';', value: ';' },
                                        { label: ',', value: ',' },

                                    ]}>

                                </Checkbox.Group>
                            </Form.Item>
                            ]}
                        </div>






                        {/* 选择附件字段 */}
                        <Form.Item
                            rules={[{ required: true }]}
                            name='fileFieldId'
                            initialValue={fieldMetaList?.find(({ type }) => type === FieldType.Attachment)?.id} label={t('select.fileFieldId')}>
                            <Select
                                onChange={() => setPreTableFitForm(false)}
                                options={fieldMetaList?.filter(({ type }) => type === FieldType.Attachment).map(({ id, name }) => ({ label: name, value: id }))}
                            >
                            </Select>
                        </Form.Item>




                        <div className='space-around'>
                            {/* 默认覆盖已有附件 */}
                            <Form.Item
                                name='overWriteFile'
                                valuePropName='checked'
                                label={t('overWrite.exit.file')}
                                hidden={uploadActionType === UploadFileActionType.AddNewRecord}
                                initialValue={true}>
                                <Switch onChange={() => {
                                    setPreTableFitForm(false)
                                }}></Switch>
                            </Form.Item>

                            <div className='fileUploadContainer'>
                                <div className='fileInput'>
                                    <input draggable id='filesInput' type='file' multiple onChange={(e) => {
                                        setFileList([...e.target.files || []]);
                                        setPreTableFitForm(false)
                                    }}></input>

                                </div>
                                <div className='fileInputMask'>
                                    <div className='uploadIcon'>
                                        <CloudUploadOutlined rev={undefined} />
                                    </div>
                                    <div>
                                        {fileList.length ? <span style={{ color: '#1890ff' }}>{t('selected.num.file', { num: fileList.length })}</span> : t('please.choose.file')}
                                    </div>
                                </div>
                            </div>

                        </div>

                        <Form.Item rules={[{ required: true }]}>
                            {uploadActionType === UploadFileActionType.GetFileByName && <div id='btnsContainer' className='btnsContainer'>


                                <SubmitButton text={t('btn.preview')} disabled={!fileList.length} form={form}></SubmitButton>
                                {PreTable && preTableFitForm && <Button
                                    disabled={uploadEnd}
                                    type='primary'
                                    onClick={onClickUpload}>
                                    {uploadEnd ? t('upload.end') : t('upload.file')}
                                </Button>}
                            </div>}
                            {
                                uploadActionType === UploadFileActionType.AddNewRecord && <SubmitButton
                                    disabled={!fileList.length}
                                    text={t('btn.add.upload.file')}
                                    form={form}></SubmitButton>
                            }
                        </Form.Item>
                    </Form>



                    <br id='preTablePosition'>
                    </br>


                    {uploadActionType === UploadFileActionType.GetFileByName && PreTable}
                </div>
            </Spin>
        </div>
    )
}


const SubmitButton = ({ form, disabled, text }: { form: FormInstance, disabled?: boolean, text: string }) => {
    const [submittable, setSubmittable] = React.useState(false);

    // Watch all values
    const values = Form.useWatch([], form);

    React.useEffect(() => {
        form.validateFields({ validateOnly: true }).then(
            () => {
                setSubmittable(true);
            },
            () => {
                setSubmittable(false);
            },
        );
    }, [values]);

    return (
        <Button htmlType="submit" disabled={disabled || !submittable}>
            {/* 预览 */}
            {text}
        </Button>
    );
};

// 预览table
function getPreviewTable({ fieldsMetaList, fileFieldId, allRecordsIds, compares, comparesFieldValueList, recordFiles, overWriteFile,
    exitFileValueList, }: {
        fieldsMetaList: IFieldMeta[],
        fileFieldId: string,
        compares: string[],
        recordFiles: Map<string, { name: string }[] | null | undefined>
        allRecordsIds: string[],
        // 所用到的值列表
        comparesFieldValueList: {
            [fieldId: string]: {
                [recordId: string]: IOpenCellValue
            }
        },
        overWriteFile: boolean,
        exitFileValueList: {
            [recordId: string]: any[]
        },
    }) {

    if (!compares || !fileFieldId || !fieldsMetaList || !comparesFieldValueList || !allRecordsIds) {
        return null
    }
    const columns: any[] = fieldsMetaList.filter(({ id }) => compares.includes(id)).map(({ name, id }) => ({
        title: name, // 比较字段
        dataIndex: id,
        key: id,
        render: (cell: any) => getTalbeCellString(cell) //TODO
    }))
    columns.push({
        title: fieldsMetaList.find(({ id }) => fileFieldId === id)!.name, // 附件字段
        dataIndex: fileFieldId,
        key: fileFieldId,
        fixed: 'right',
        width: 100,
        render: (cell: File[]) => {
            return <div className='tableCell'>{cell?.map?.((file: File) => file.name).join('\n')}</div>
        }
    })

    const dataSource = allRecordsIds.map((recordId: string) => {
        const comparesFields = compares.map((fieldId) => [fieldId, comparesFieldValueList[fieldId][recordId]])
        let fileFields = [fileFieldId, recordFiles.get(recordId)]
        if (!overWriteFile && exitFileValueList[recordId]) {
            fileFields = [fileFieldId, exitFileValueList[recordId]]
        }
        return Object.fromEntries(comparesFields.concat([fileFields as any]))
    })

    return <Table scroll={{ x: window.innerWidth + columns.length * 100, y: window.innerHeight - 100 }} dataSource={dataSource} columns={columns} pagination={{ position: ['bottomRight'] }}></Table>
}


function getTalbeCellString(cell: IOpenCellValue) {
    if (Array.isArray(cell)) {
        //@ts-ignore
        return cell.map(({ name, text, fullAddress, email, url }) => text || fullAddress || name || url || email || '').join('')
    }
    if (typeof cell === 'object' && cell) {
        //@ts-ignore
        return cell.text || cell.fullAddress || cell.link || cell.name || ''
    }
    return String(cell ?? '')
}
//@ts-ignore
window.getTalbeCellString = getTalbeCellString


function createRegexFromString(str: string) {
    const regexParts = str.trim().match(/\/(.*)\/([gimyus]{0,6})/);

    if (regexParts && regexParts.length >= 3) {
        const pattern = regexParts[1];
        const flags = regexParts[2];

        const regex = new RegExp(pattern, flags);

        return regex;
    } else {
        throw new Error('Invalid regular expression string');
    }
}